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
      // Precise range: Starts at D-1 18:00Z (captures IST midnight) to D 23:59:59Z
      where.date = {
        gte: new Date(new Date(startDate as string + 'T00:00:00Z').getTime() - (6 * 60 * 60 * 1000)),
        lte: new Date(endDate as string + 'T23:59:59Z'),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(new Date(startDate as string + 'T00:00:00Z').getTime() - (6 * 60 * 60 * 1000)),
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

// Import Attendance Route
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const tenantId = (req as any).user.tenantId;
    const workbook = new ExcelJS.Workbook();

    // Detect format
    if (req.file.originalname.endsWith('.csv')) {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(400).json({ error: 'No worksheet found' });
    }

    // Map headers
    const headers: any = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell: any, colNumber: any) => {
      const val = cell.value ? cell.value.toString().toLowerCase().trim() : '';
      if (val.includes('code') || val === 'id' || val === 'employee id') headers.code = colNumber;
      else if (val.includes('date')) headers.date = colNumber;
      else if (val.includes('first') || val === 'in' || val === 'in time') headers.in = colNumber;
      else if (val.includes('last') || val === 'out' || val === 'out time') headers.out = colNumber;
      else if (val === 'status') headers.status = colNumber;
    });

    if (!headers.code || !headers.date) {
      return res.status(400).json({ error: 'Missing required columns: Employee Code, Date' });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Fetch all employees for this tenant to quick lookup ID
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      select: { id: true, employeeCode: true }
    });
    const empMap = new Map(employees.map(e => [e.employeeCode.toLowerCase(), e.id]));

    // Process rows (skip header)
    const rowsToProcess: any[] = [];
    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      rowsToProcess.push({
        code: row.getCell(headers.code).value,
        date: row.getCell(headers.date).value,
        in: headers.in ? row.getCell(headers.in).value : null,
        out: headers.out ? row.getCell(headers.out).value : null,
        status: headers.status ? row.getCell(headers.status).value : null,
        rowNumber
      });
    });

    for (const rowData of rowsToProcess) {
      try {
        if (!rowData.code) continue;

        const empCode = rowData.code.toString().trim();
        const empId = empMap.get(empCode.toLowerCase());

        if (!empId) {
          failCount++;
          errors.push(`Row ${rowData.rowNumber}: Employee code '${empCode}' not found`);
          continue;
        }

        // Parse Date
        let dateVal = rowData.date;
        let parsedDate: Date;

        if (dateVal instanceof Date) {
          parsedDate = dateVal;
        } else {
          if (typeof dateVal === 'string') {
            if (dateVal.match(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/)) {
              const parts = dateVal.split(/[/-]/);
              // DD-MM-YYYY
              parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
              parsedDate = new Date(dateVal);
            }
          } else {
            parsedDate = new Date(dateVal);
          }
        }

        if (isNaN(parsedDate.getTime())) {
          failCount++;
          errors.push(`Row ${rowData.rowNumber}: Invalid date '${dateVal}'`);
          continue;
        }

        // Normalise date to UTC midnight for key
        const dateKey = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

        // Parse In/Out Times
        const parseTime = (val: any) => {
          if (!val) return null;
          if (val instanceof Date) return val;
          if (typeof val === 'string') {
            // try to match HH:mm or HH:mm:ss
            const parts = val.trim().split(':');
            if (parts.length >= 2) {
              const d = new Date(parsedDate); // Base on the attendance date
              d.setHours(parseInt(parts[0]), parseInt(parts[1]), parts[2] ? parseInt(parts[2]) : 0);
              return d;
            }
          }
          return null;
        };

        const firstIn = parseTime(rowData.in);
        const lastOut = parseTime(rowData.out);

        let workingHours: number | null = null;
        if (firstIn && lastOut) {
          workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
        }

        let status = 'present';
        if (rowData.status) status = rowData.status.toString().toLowerCase();
        else if (!firstIn && !lastOut && !rowData.status) status = 'absent';

        await prisma.attendanceLog.upsert({
          where: {
            employeeId_date_tenantId: {
              tenantId,
              employeeId: empId,
              date: dateKey
            }
          },
          update: {
            firstIn: firstIn || undefined,
            lastOut: lastOut || undefined,
            workingHours: workingHours || undefined,
            status
          },
          create: {
            tenantId,
            employeeId: empId,
            date: dateKey,
            firstIn,
            lastOut,
            workingHours,
            status
          }
        });

        successCount++;

      } catch (err: any) {
        failCount++;
        errors.push(`Row ${rowData.rowNumber}: ${err.message}`);
      }
    }

    // Clean up
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      success: true,
      imported: successCount,
      failed: failCount,
      errors: errors.slice(0, 50)
    });

  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
