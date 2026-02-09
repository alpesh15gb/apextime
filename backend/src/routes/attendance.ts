import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import multer from 'multer';
import fs from 'fs';
import ExcelJS from 'exceljs';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.use(authenticate);

// Import status tracking
const importStatus = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  message: string;
  startedAt: Date;
  completedAt?: Date;
}>();

// Status endpoint to check import progress
router.get('/import/status/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const status = importStatus.get(tenantId);
  
  if (!status) {
    return res.json({ status: 'idle', message: 'No active import' });
  }
  
  res.json(status);
});

// Get attendance logs
router.get('/', async (req, res) => {
  try {
    const {
      employeeId,
      departmentId,
      branchId,
      startDate,
      endDate,
      status,
      locationId,
      search,
      page = '1',
      limit = '50'
    } = req.query;

    const tenantId = (req as any).user.tenantId;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string) || 50, 500); // Cap at 500 to prevent OOM
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tenantId };

    if (employeeId) where.employeeId = employeeId as string;
    if (status) where.status = status as string;

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string + 'T00:00:00Z'),
        lte: new Date(endDate as string + 'T23:59:59Z'),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate as string + 'T00:00:00Z'),
      };
    }

    const employeeFilters: any[] = [];

    if (departmentId) employeeFilters.push({ departmentId: departmentId as string });
    if (branchId) employeeFilters.push({ branchId: branchId as string });

    // Cascading Location Filter: Check direct location OR branch's location
    if (locationId) {
      employeeFilters.push({
        OR: [
          { locationId: locationId as string },
          { branch: { locationId: locationId as string } }
        ]
      });
    }

    if (search) {
      employeeFilters.push({
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { employeeCode: { contains: search as string, mode: 'insensitive' } },
        ]
      });
    }

    if (employeeFilters.length > 0) {
      where.employee = {
        AND: employeeFilters
      };
    }

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        include: {
          employee: {
            include: {
              department: true,
              branch: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { date: 'desc' },
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get attendance logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance summary for an employee
router.get('/summary/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;
    const targetYear = parseInt(year as string) || new Date().getFullYear();

    const startOfMonth = new Date(new Date(Date.UTC(targetYear, targetMonth - 1, 1)).getTime() - (6 * 60 * 60 * 1000));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59));

    const logs = await prisma.attendanceLog.findMany({
      where: {
        tenantId: (req as any).user.tenantId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const summary = {
      present: logs.filter(l => (l.status || '').toLowerCase() === 'present').length,
      absent: logs.filter(l => (l.status || '').toLowerCase() === 'absent').length,
      halfDay: logs.filter(l => (l.status || '').toLowerCase() === 'half day').length,
      late: logs.filter(l => l.lateArrival > 0).length,
      earlyDeparture: logs.filter(l => l.earlyDeparture > 0).length,
      totalWorkingHours: logs.reduce((acc, l) => acc + (l.workingHours || 0), 0),
      totalDays: logs.length,
    };

    res.json(summary);
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's attendance
router.get('/today/all', async (req, res) => {
  try {
    const today = new Date();
    // Use UTC start for @db.Date matching
    const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const logs = await prisma.attendanceLog.findMany({
      where: {
        tenantId: (req as any).user.tenantId,
        date: {
          gte: startOfToday,
        },
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
      orderBy: {
        firstIn: 'desc',
      },
    });

    res.json(logs);
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual attendance entry/update
router.post('/manual', async (req, res) => {
  try {
    const { employeeId, date, firstIn, lastOut, status } = req.body;

    const attendanceDate = parseISO(date);
    const parsedFirstIn = firstIn ? new Date(firstIn) : null;
    const parsedLastOut = lastOut ? new Date(lastOut) : null;

    let workingHours = null;
    if (parsedFirstIn && parsedLastOut) {
      const diffMs = parsedLastOut.getTime() - parsedFirstIn.getTime();
      workingHours = diffMs / (1000 * 60 * 60);
    }

    const tenantId = (req as any).user.tenantId;
    const log = await prisma.attendanceLog.upsert({
      where: {
        employeeId_date_tenantId: {
          employeeId,
          date: attendanceDate,
          tenantId,
        },
      },
      update: {
        firstIn: parsedFirstIn,
        lastOut: parsedLastOut,
        workingHours,
        status,
      },
      create: {
        tenantId,
        employeeId,
        date: attendanceDate,
        firstIn: parsedFirstIn,
        lastOut: parsedLastOut,
        workingHours,
        status: status || 'present',
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    res.json(log);
  } catch (error) {
    console.error('Manual attendance entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly attendance report (matrix format like the paper)
router.get('/monthly-report', async (req, res) => {
  try {
    const { month, year, departmentId, branchId, locationId } = req.query;

    // ... params ...

    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;
    const targetYear = parseInt(year as string) || new Date().getFullYear();

    // Date range for @db.Date matching
    const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59));
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate(); // Calculate daysInMonth from local date for correct count

    const where: any = {
      tenantId: (req as any).user.tenantId,
      date: {
        gte: start,
        lte: end,
      },
    };

    // Build employee filter
    const employeeWhere: any = {
      status: 'active',
      tenantId: (req as any).user.tenantId,
      AND: []
    };

    if (departmentId) employeeWhere.departmentId = departmentId as string;
    if (branchId) employeeWhere.branchId = branchId as string;

    if (locationId) {
      employeeWhere.AND.push({
        OR: [
          { locationId: locationId as string },
          { branch: { locationId: locationId as string } }
        ]
      });
    }

    // Clean up empty AND
    if (employeeWhere.AND.length === 0) delete employeeWhere.AND;

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        branch: true,
      },
      orderBy: { firstName: 'asc' },
    });

    // Get all attendance logs for the month
    const logs = await prisma.attendanceLog.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        employeeId: {
          in: employees.map(e => e.id),
        },
        tenantId: (req as any).user.tenantId,
      },
    });

    // Get holidays for the month
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        tenantId: (req as any).user.tenantId,
      },
    });

    // Get recurring holidays
    const recurringHolidays = await prisma.holiday.findMany({
      where: {
        isRecurring: true,
      },
    });

    // Create a set of holiday dates (day numbers)
    const holidayDays = new Set<number>();
    const holidayNames = new Map<number, string>();

    // Holiday.date is @db.Date — Prisma returns UTC midnight. Use UTC getters.
    holidays.forEach(h => {
      const d = new Date(h.date);
      // Use getUTC getters for @db.Date matching
      if (d.getUTCMonth() + 1 === targetMonth && d.getUTCFullYear() === targetYear) {
        const dayNum = d.getUTCDate();
        holidayDays.add(dayNum);
        holidayNames.set(dayNum, h.name);
      }
    });

    // Add recurring holidays
    recurringHolidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getMonth() + 1 === targetMonth) {
        holidayDays.add(d.getDate());
        holidayNames.set(d.getDate(), h.name + (h.isRecurring ? ' (R)' : ''));
      }
    });

    // AttendanceLog.date is @db.Date — could be 00:00Z or D-1 18:30Z
    const logsByEmployee = new Map();
    for (const log of logs) {
      const d = new Date(log.date);
      // Dual-midnight mapping: if it's late evening UTC, it belongs to the NEXT day locally (IST)
      const day = d.getUTCHours() > 12 ? d.getUTCDate() + 1 : d.getUTCDate();

      if (!logsByEmployee.has(log.employeeId)) {
        logsByEmployee.set(log.employeeId, new Map());
      }
      logsByEmployee.get(log.employeeId).set(day, log);
    }

    // Build report data
    const reportData = employees.map(employee => {
      const employeeLogs = logsByEmployee.get(employee.id) || new Map();
      const dailyData = [];
      let totalWorkingHours = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let workedOnOffDay = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const log = employeeLogs.get(day);
        const date = new Date(targetYear, targetMonth - 1, day);
        const isSunday = date.getDay() === 0;
        const isHoliday = holidayDays.has(day);
        const isOffDay = isSunday || isHoliday;

        if (log) {
          totalWorkingHours += log.workingHours || 0;
          if ((log.status || '').toLowerCase() === 'present') presentDays++;
          if (log.lateArrival > 0) lateDays++;
          if (isOffDay) workedOnOffDay++;

          dailyData.push({
            day,
            firstIn: log.firstIn,
            lastOut: log.lastOut,
            workingHours: log.workingHours,
            lateArrival: log.lateArrival,
            earlyDeparture: log.earlyDeparture,
            status: log.status,
            isSunday,
            isHoliday,
            isOffDay,
            holidayName: holidayNames.get(day),
          });
        } else {
          if (!isOffDay) absentDays++;
          dailyData.push({
            day,
            firstIn: null,
            lastOut: null,
            workingHours: null,
            lateArrival: 0,
            earlyDeparture: 0,
            status: isOffDay ? 'off' : 'absent',
            isSunday,
            isHoliday,
            isOffDay,
            holidayName: holidayNames.get(day),
          });
        }
      }

      return {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeCode: employee.employeeCode,
          department: employee.department?.name || 'N/A',
          branch: employee.branch?.name || 'N/A',
          location: 'N/A', // Removed location rel
        },
        dailyData,
        summary: {
          presentDays,
          absentDays,
          lateDays,
          workedOnOffDay,
          totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        },
      };
    });

    // Format holidays for response
    const formattedHolidays: Array<{ day: number, name: string, isRecurring: boolean }> = [];

    holidays.forEach(h => {
      const d = new Date(h.date);
      // Use getUTC getters for @db.Date
      if (d.getUTCMonth() + 1 === targetMonth && d.getUTCFullYear() === targetYear) {
        formattedHolidays.push({
          day: d.getUTCDate(),
          name: h.name,
          isRecurring: h.isRecurring,
        });
      }
    });

    recurringHolidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getUTCMonth() + 1 === targetMonth) {
        formattedHolidays.push({
          day: d.getUTCDate(),
          name: h.name,
          isRecurring: h.isRecurring,
        });
      }
    });

    formattedHolidays.sort((a, b) => a.day - b.day);

    res.json({
      month: targetMonth,
      year: targetYear,
      daysInMonth,
      holidays: formattedHolidays,
      reportData,
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Custom date range report for printout
 * Returns employees grouped by department/branch with daily In/Out data
 */
router.get('/date-range-report', async (req, res) => {
  try {
    const { startDate, endDate, departmentId, branchId, locationId, groupBy } = req.query;
    const tenantId = (req as any).user.tenantId;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate as string + 'T00:00:00Z');
    const end = new Date(endDate as string + 'T23:59:59Z');

    // Calculate all dates in range
    const dates: { date: Date; day: number; month: number; year: number; dayName: string; dateKey: string }[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dateKey = current.toISOString().split('T')[0];
      dates.push({
        date: new Date(current),
        day: current.getUTCDate(),
        month: current.getUTCMonth() + 1,
        year: current.getUTCFullYear(),
        dayName: dayNames[current.getUTCDay()],
        dateKey,
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Build employee filter
    const employeeWhere: any = {
      status: 'active',
      tenantId,
      AND: []
    };
    if (departmentId) employeeWhere.departmentId = departmentId as string;
    if (branchId) employeeWhere.branchId = branchId as string;
    if (locationId) {
      employeeWhere.AND.push({
        OR: [
          { locationId: locationId as string },
          { branch: { locationId: locationId as string } }
        ]
      });
    }
    if (employeeWhere.AND.length === 0) delete employeeWhere.AND;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: { department: true, branch: true },
      orderBy: [{ department: { name: 'asc' } }, { firstName: 'asc' }],
    });

    // Get attendance logs
    const logs = await prisma.attendanceLog.findMany({
      where: {
        tenantId,
        date: { gte: start, lte: end },
        employeeId: { in: employees.map(e => e.id) },
      },
    });

    // Get holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        tenantId,
        date: { gte: start, lte: end },
      },
    });
    const holidaySet = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));

    // Index logs by employeeId + dateKey
    const logIndex = new Map<string, any>();
    for (const log of logs) {
      const d = new Date(log.date);
      const dateKey = d.toISOString().split('T')[0];
      logIndex.set(`${log.employeeId}:${dateKey}`, log);
    }

    // Build report per employee
    const reportData = employees.map(emp => {
      const dailyData: any[] = [];
      let presentDays = 0, absentDays = 0, lateDays = 0, totalWorkingHours = 0;

      for (const dateInfo of dates) {
        const dateKey = dateInfo.dateKey;
        const log = logIndex.get(`${emp.id}:${dateKey}`);
        const isSunday = dateInfo.dayName === 'Sun';
        const isHoliday = holidaySet.has(dateKey);
        const isOff = isSunday || isHoliday;

        if (log) {
          presentDays++;
          totalWorkingHours += log.workingHours || 0;
          if (log.lateArrival > 0) lateDays++;
          dailyData.push({
            dateKey,
            day: dateInfo.day,
            dayName: dateInfo.dayName,
            firstIn: log.firstIn,
            lastOut: log.lastOut,
            workingHours: log.workingHours,
            status: log.status,
            isSunday, isHoliday, isOff,
          });
        } else {
          if (!isOff) absentDays++;
          dailyData.push({
            dateKey,
            day: dateInfo.day,
            dayName: dateInfo.dayName,
            firstIn: null,
            lastOut: null,
            workingHours: null,
            status: isOff ? 'off' : 'absent',
            isSunday, isHoliday, isOff,
          });
        }
      }

      return {
        employee: {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeCode,
          department: emp.department?.name || 'Unassigned',
          branch: emp.branch?.name || 'Unassigned',
        },
        dailyData,
        summary: { presentDays, absentDays, lateDays, totalWorkingHours: Math.round(totalWorkingHours * 100) / 100 },
      };
    });

    // Group by department or branch
    const grouped: Record<string, any[]> = {};
    const groupField = (groupBy as string) === 'branch' ? 'branch' : 'department';
    for (const emp of reportData) {
      const key = emp.employee[groupField] || 'Unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(emp);
    }

    res.json({
      startDate: startDate as string,
      endDate: endDate as string,
      totalDays: dates.length,
      dates,
      groups: Object.entries(grouped).map(([name, employees]) => ({ name, employees })),
      reportData,
    });
  } catch (error) {
    console.error('Date range report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Administrative route to re-process historical logs with latest logic
router.post('/reprocess', async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.body;

    // Dynamic import to avoid circular dependency
    const { reprocessHistoricalLogs } = await import('../services/logSyncService');

    const start = startDate ? new Date(startDate + 'T00:00:00Z') : undefined;
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : undefined;

    const result = await reprocessHistoricalLogs(start, end, employeeId);

    res.json({
      message: 'Historical re-processing completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Reprocess attendance error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Historical re-processing failed' });
  }
});

/**
 * RECALCULATE attendance from stored punch logs
 * Re-applies First IN / Last OUT logic and recalculates all derived fields
 * Works directly on AttendanceLog records (no RawDeviceLog dependency)
 */
router.post('/recalculate', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const { startDate, endDate, employeeId } = req.body;

    const where: any = { tenantId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate + 'T00:00:00Z'),
        lte: new Date(endDate + 'T23:59:59Z'),
      };
    } else if (startDate) {
      where.date = { gte: new Date(startDate + 'T00:00:00Z') };
    }

    if (employeeId) where.employeeId = employeeId;

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: { employee: { include: { shift: true } } }
    });

    console.log(`[RECALCULATE] Processing ${logs.length} attendance logs...`);

    let updated = 0;
    let errors = 0;

    for (const log of logs) {
      try {
        // Parse stored punch logs
        let punches: Date[] = [];
        if (log.logs) {
          try {
            const parsed = JSON.parse(log.logs as string);
            if (Array.isArray(parsed)) {
              punches = parsed.map((t: string) => new Date(t)).filter((d: Date) => !isNaN(d.getTime()));
            }
          } catch { /* invalid JSON, skip */ }
        }

        // If no stored logs, use firstIn/lastOut as fallback
        if (punches.length === 0) {
          if (log.firstIn) punches.push(new Date(log.firstIn));
          if (log.lastOut) punches.push(new Date(log.lastOut));
        }

        if (punches.length === 0) continue;

        // Sort ascending
        punches.sort((a, b) => a.getTime() - b.getTime());

        // FIRST IN = earliest punch
        const firstIn = punches[0];

        // LAST OUT = latest punch (must be >1min from firstIn)
        let lastOut: Date | null = null;
        if (punches.length > 1) {
          const lastPunch = punches[punches.length - 1];
          if (lastPunch.getTime() - firstIn.getTime() > 60000) {
            lastOut = lastPunch;
          }
        }

        // Working hours = First IN to Last OUT
        let workingHours = 0;
        if (lastOut) {
          workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
          if (workingHours > 24 || workingHours < 0) workingHours = 0;
        }

        // Late arrival calculation
        let lateArrival = 0;
        const shift = log.employee?.shift;
        if (shift?.startTime) {
          const logDate = new Date(log.date);
          const shiftTime = new Date(shift.startTime);
          const sh = shiftTime.getUTCHours();
          const sm = shiftTime.getUTCMinutes();
          const shiftStart = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), sh, sm);
          const grace = shift.gracePeriodIn || 0;
          const graceTime = new Date(shiftStart.getTime() + grace * 60000);
          if (firstIn > graceTime) {
            lateArrival = (firstIn.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
          }
        }

        // Early departure
        let earlyDeparture = 0;
        if (shift?.endTime && lastOut) {
          const logDate = new Date(log.date);
          const endTime = new Date(shift.endTime);
          const eh = endTime.getUTCHours();
          const em = endTime.getUTCMinutes();
          const shiftEnd = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), eh, em);
          if (new Date(shift.startTime) > new Date(shift.endTime)) shiftEnd.setDate(shiftEnd.getDate() + 1);
          if (lastOut < shiftEnd) {
            earlyDeparture = (shiftEnd.getTime() - lastOut.getTime()) / (1000 * 60 * 60);
          }
        }

        // Status
        let status = 'Present';
        if (!lastOut) {
          status = 'Shift Incomplete';
        } else if (workingHours < 4) {
          status = 'Half Day';
        }

        // Update
        await prisma.attendanceLog.update({
          where: { id: log.id },
          data: {
            firstIn,
            lastOut,
            workingHours: Math.round(workingHours * 100) / 100,
            totalHours: Math.round(workingHours * 100) / 100,
            lateArrival: Math.round(Math.max(0, lateArrival) * 100) / 100,
            earlyDeparture: Math.round(Math.max(0, earlyDeparture) * 100) / 100,
            status,
            totalPunches: punches.length,
          }
        });
        updated++;
      } catch (e) {
        errors++;
        console.error(`[RECALCULATE] Error on log ${log.id}:`, e);
      }
    }

    console.log(`[RECALCULATE] Done: ${updated} updated, ${errors} errors out of ${logs.length} total`);

    res.json({
      message: `Recalculation complete`,
      total: logs.length,
      updated,
      errors,
    });
  } catch (error) {
    console.error('Recalculate attendance error:', error);
    res.status(500).json({ error: 'Recalculation failed' });
  }
});

// Import Attendance Route
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const tenantId = (req as any).user.tenantId;
    const deviceType = req.body.deviceType || 'auto'; // 'hikvision', 'essl', or 'auto'
    
    // Initialize status tracking
    importStatus.set(tenantId, {
      status: 'processing',
      progress: 0,
      total: 0,
      message: 'Starting CSV processing...',
      startedAt: new Date()
    });
    
    // Respond immediately to avoid timeout
    res.json({
      message: 'CSV upload started. Processing in background...',
      status: 'processing',
      info: 'Check status at: GET /api/attendance/import/status/' + tenantId,
      tenantId: tenantId
    });

    // Process file in background (non-blocking)
    setImmediate(async () => {
      try {
        console.log(`[CSV IMPORT] Starting background processing for ${req.file!.originalname}`);
        
        const workbook = new ExcelJS.Workbook();

        // Detect format
        if (req.file!.originalname.endsWith('.csv')) {
          await workbook.csv.readFile(filePath);
        } else {
          await workbook.xlsx.readFile(filePath);
        }

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          console.error('[CSV IMPORT] No worksheet found');
          fs.unlinkSync(filePath);
          return;
        }

        // Map headers based on device type
        const headers: any = {};
        const headerRow = worksheet.getRow(1);
        
        // Detect device type if auto
        let detectedType = deviceType;
        if (deviceType === 'auto') {
          const firstHeader = headerRow.getCell(1).value?.toString().toLowerCase() || '';
          if (firstHeader.includes('employee code')) {
            detectedType = 'hikvision';
          } else if (firstHeader.includes('first name')) {
            detectedType = 'essl';
          }
        }

        console.log(`[CSV IMPORT] Processing ${detectedType} format`);

    if (detectedType === 'hikvision') {
      // Hikvision Format: Employee Code, Employee Name, Employee Code In Device, LogDate, Company, Department
      console.log('[CSV IMPORT] Detecting Hikvision columns...');
      
      headerRow.eachCell((cell: any, colNumber: any) => {
        const val = cell.value ? cell.value.toString().toLowerCase().trim().replace(/\s+/g, '') : '';
        console.log(`[CSV IMPORT] Column ${colNumber}: "${cell.value}" -> normalized: "${val}"`);
        
        // More flexible matching
        if (val.includes('employeecode') || val.includes('empcode') || val === 'code' || val === 'id') {
          headers.code = colNumber;
          console.log(`[CSV IMPORT] ✓ Found employee code at column ${colNumber}`);
        } else if (val.includes('employeename') || val.includes('name')) {
          headers.name = colNumber;
        } else if (val.includes('logdate') || val.includes('date') || val.includes('datetime') || val.includes('timestamp')) {
          headers.logDate = colNumber;
          console.log(`[CSV IMPORT] ✓ Found logDate at column ${colNumber}`);
        }
      });

      console.log(`[CSV IMPORT] Headers found: code=${headers.code}, logDate=${headers.logDate}`);

      if (!headers.code || !headers.logDate) {
        // Log all available headers for debugging
        const availableHeaders: string[] = [];
        headerRow.eachCell((cell: any) => {
          if (cell.value) availableHeaders.push(cell.value.toString());
        });
        
        const errorMsg = `Missing required Hikvision columns. Found: [${availableHeaders.join(', ')}]. Need: Employee Code and LogDate`;
        console.error(`[CSV IMPORT] ${errorMsg}`);
        importStatus.set(tenantId, {
          status: 'failed',
          progress: 0,
          total: 0,
          message: errorMsg,
          startedAt: importStatus.get(tenantId)!.startedAt,
          completedAt: new Date()
        });
        fs.unlinkSync(filePath);
        return;
      }
    } else if (detectedType === 'essl') {
      // ESSL Format: First Name, Last Name, ID, Department, Date, Week, Time, ...
      console.log('[CSV IMPORT] Detecting ESSL columns...');
      
      headerRow.eachCell((cell: any, colNumber: any) => {
        const val = cell.value ? cell.value.toString().toLowerCase().trim().replace(/\s+/g, '') : '';
        console.log(`[CSV IMPORT] Column ${colNumber}: "${cell.value}" -> normalized: "${val}"`);
        
        if (val.includes('id') || val.includes('employeecode') || val.includes('code')) {
          headers.code = colNumber;
          console.log(`[CSV IMPORT] ✓ Found employee code at column ${colNumber}`);
        } else if (val.includes('firstname')) {
          headers.firstName = colNumber;
        } else if (val.includes('lastname')) {
          headers.lastName = colNumber;
        } else if (val === 'date' || val.includes('attendancedate')) {
          headers.date = colNumber;
          console.log(`[CSV IMPORT] ✓ Found date at column ${colNumber}`);
        } else if (val.includes('time') && !val.includes('datetime')) {
          headers.time = colNumber;
          console.log(`[CSV IMPORT] ✓ Found time at column ${colNumber}`);
        } else if (val.includes('logdate') || val.includes('datetime')) {
          headers.logDate = colNumber;
          console.log(`[CSV IMPORT] ✓ Found logDate at column ${colNumber}`);
        }
      });

      console.log(`[CSV IMPORT] Headers found: code=${headers.code}, date=${headers.date}, logDate=${headers.logDate}`);

      if (!headers.code || (!headers.date && !headers.logDate)) {
        // Log all available headers for debugging
        const availableHeaders: string[] = [];
        headerRow.eachCell((cell: any) => {
          if (cell.value) availableHeaders.push(cell.value.toString());
        });
        
        const errorMsg = `Missing required ESSL columns. Found: [${availableHeaders.join(', ')}]. Need: ID/Code and Date`;
        console.error(`[CSV IMPORT] ${errorMsg}`);
        importStatus.set(tenantId, {
          status: 'failed',
          progress: 0,
          total: 0,
          message: errorMsg,
          startedAt: importStatus.get(tenantId)!.startedAt,
          completedAt: new Date()
        });
        fs.unlinkSync(filePath);
        return;
      }
    } else {
      // Generic format detection
      headerRow.eachCell((cell: any, colNumber: any) => {
        const val = cell.value ? cell.value.toString().toLowerCase().trim() : '';
        if (val.includes('code') || val === 'id' || val === 'employee id') headers.code = colNumber;
        else if (val.includes('date')) headers.date = colNumber;
        else if (val.includes('first') || val === 'in' || val === 'in time') headers.in = colNumber;
        else if (val.includes('last') || val === 'out' || val === 'out time') headers.out = colNumber;
        else if (val === 'status') headers.status = colNumber;
      });

      if (!headers.code || !headers.date) {
        const errorMsg = 'Missing required columns: Employee Code, Date';
        console.error(`[CSV IMPORT] ${errorMsg}`);
        importStatus.set(tenantId, {
          status: 'failed',
          progress: 0,
          total: 0,
          message: errorMsg,
          startedAt: importStatus.get(tenantId)!.startedAt,
          completedAt: new Date()
        });
        fs.unlinkSync(filePath);
        return;
      }
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Fetch all employees for this tenant
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      select: { id: true, employeeCode: true }
    });
    const empMap = new Map(employees.map(e => [e.employeeCode.toLowerCase().trim(), e.id]));

    // Update status
    importStatus.set(tenantId, {
      status: 'processing',
      progress: 0,
      total: worksheet.rowCount - 1,
      message: `Processing ${worksheet.rowCount - 1} rows...`,
      startedAt: importStatus.get(tenantId)!.startedAt
    });

    // Group punches by employee and date
    const punchGroups: Map<string, { employeeId: string; date: Date; punches: Date[] }> = new Map();

    // Process rows (skip header)
    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;

      try {
        const empCode = row.getCell(headers.code).value?.toString().trim();
        if (!empCode) return;

        const empId = empMap.get(empCode.toLowerCase());
        if (!empId) {
          failCount++;
          errors.push(`Row ${rowNumber}: Employee code '${empCode}' not found`);
          return;
        }

        let punchDate: Date;
        let punchTime: Date;

        if (detectedType === 'hikvision') {
          // LogDate contains both date and time: "2/8/2026 19:07"
          const logDateValue = row.getCell(headers.logDate).value;
          if (!logDateValue) return;

          if (logDateValue instanceof Date) {
            punchTime = logDateValue;
          } else if (typeof logDateValue === 'string') {
            // Parse "M/D/YYYY HH:MM" or "M/D/YYYY HH:MM:SS"
            punchTime = new Date(logDateValue);
          } else {
            return;
          }

          if (isNaN(punchTime.getTime())) {
            failCount++;
            errors.push(`Row ${rowNumber}: Invalid LogDate`);
            return;
          }

          punchDate = new Date(Date.UTC(punchTime.getFullYear(), punchTime.getMonth(), punchTime.getDate()));
        } else if (detectedType === 'essl') {
          // Date and Time are separate or combined in LogDate
          const dateValue = headers.logDate ? row.getCell(headers.logDate).value : row.getCell(headers.date).value;
          const timeValue = headers.time ? row.getCell(headers.time).value : null;

          if (!dateValue) return;

          if (dateValue instanceof Date) {
            punchDate = new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()));
            punchTime = dateValue;
          } else if (typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              failCount++;
              errors.push(`Row ${rowNumber}: Invalid date`);
              return;
            }
            punchDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
            
            if (timeValue) {
              const timeStr = timeValue.toString();
              const timeParts = timeStr.split(':');
              if (timeParts.length >= 2) {
                punchTime = new Date(parsedDate);
                punchTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), timeParts[2] ? parseInt(timeParts[2]) : 0);
              } else {
                punchTime = parsedDate;
              }
            } else {
              punchTime = parsedDate;
            }
          } else {
            return;
          }
        } else {
          // Generic handling
          return;
        }

        // Create group key: employeeId + date
        const dateKey = punchDate.toISOString().split('T')[0];
        const groupKey = `${empId}_${dateKey}`;

        if (!punchGroups.has(groupKey)) {
          punchGroups.set(groupKey, {
            employeeId: empId,
            date: punchDate,
            punches: []
          });
        }

        punchGroups.get(groupKey)!.punches.push(punchTime);
        successCount++;
      } catch (error) {
        failCount++;
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Now process each group and create/update attendance logs using batch operations
    let processedCount = 0;
    const batchSize = 50;
    const groupEntries = Array.from(punchGroups.entries());
    
    console.log(`[CSV IMPORT] Processing ${groupEntries.length} employee-date groups...`);

    for (let i = 0; i < groupEntries.length; i += batchSize) {
      const batch = groupEntries.slice(i, i + batchSize);
      
      try {
        // Process batch in parallel with Promise.all
        await Promise.all(batch.map(async ([groupKey, group]) => {
          try {
            // Sort punches chronologically
            group.punches.sort((a, b) => a.getTime() - b.getTime());

            const firstIn = group.punches[0];
            const lastOut = group.punches.length > 1 ? group.punches[group.punches.length - 1] : null;

            // Calculate working hours
            let workingHours: number | null = null;
            if (lastOut && lastOut.getTime() - firstIn.getTime() > 60000) {
              workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
            }

            // Store all punches as JSON
            const logsJSON = JSON.stringify(group.punches.map(p => p.toISOString()));

            await prisma.attendanceLog.upsert({
              where: {
                employeeId_date_tenantId: {
                  employeeId: group.employeeId,
                  date: group.date,
                  tenantId,
                },
              },
              update: {
                firstIn,
                lastOut,
                workingHours,
                logs: logsJSON,
                status: 'present',
              },
              create: {
                tenantId,
                employeeId: group.employeeId,
                date: group.date,
                firstIn,
                lastOut,
                workingHours,
                logs: logsJSON,
                status: 'present',
              },
            });

            processedCount++;
          } catch (error) {
            console.error(`Error processing group ${groupKey}:`, error);
          }
        }));
        
        console.log(`[CSV IMPORT] Processed ${Math.min(i + batchSize, groupEntries.length)}/${groupEntries.length} groups`);
        
        // Update progress
        importStatus.set(tenantId, {
          status: 'processing',
          progress: Math.min(i + batchSize, groupEntries.length),
          total: groupEntries.length,
          message: `Processed ${Math.min(i + batchSize, groupEntries.length)}/${groupEntries.length} employee-date groups`,
          startedAt: importStatus.get(tenantId)!.startedAt
        });
      } catch (batchError) {
        console.error('Batch processing error:', batchError);
      }
    }

        // Cleanup uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        console.log(`[CSV IMPORT] ✅ Import completed: ${processedCount} records processed, ${successCount} punches imported, ${failCount} failed`);
        
        // Update status to completed
        importStatus.set(tenantId, {
          status: 'completed',
          progress: processedCount,
          total: processedCount,
          message: `Import completed! ${processedCount} records processed, ${successCount} punches imported`,
          startedAt: importStatus.get(tenantId)!.startedAt,
          completedAt: new Date()
        });
        
      } catch (bgError) {
        console.error('[CSV IMPORT] Background processing error:', bgError);
        
        // Update status to failed
        importStatus.set(tenantId, {
          status: 'failed',
          progress: 0,
          total: 0,
          message: `Import failed: ${bgError instanceof Error ? bgError.message : 'Unknown error'}`,
          startedAt: importStatus.get(tenantId)!.startedAt,
          completedAt: new Date()
        });
        
        // Cleanup file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Import failed' });
  }
});

export default router;
