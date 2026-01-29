import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

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
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (employeeId) where.employeeId = employeeId as string;
    if (status) where.status = status as string;

    if (startDate && endDate) {
      where.date = {
        gte: startOfDay(parseISO(startDate as string)),
        lte: endOfDay(parseISO(endDate as string)),
      };
    } else if (startDate) {
      where.date = {
        gte: startOfDay(parseISO(startDate as string)),
      };
    }

    let employeeWhere: any = {};
    if (departmentId) employeeWhere.departmentId = departmentId as string;
    if (branchId) employeeWhere.branchId = branchId as string;

    if (Object.keys(employeeWhere).length > 0) {
      where.employee = employeeWhere;
    }

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        include: {
          employee: {
            include: {
              department: true,
              branch: true,
              shift: true,
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

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        employeeId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const summary = {
      present: logs.filter(l => l.status === 'present').length,
      absent: logs.filter(l => l.status === 'absent').length,
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
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        date: {
          gte: today,
        },
      },
      include: {
        employee: {
          include: {
            department: true,
            shift: true,
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

    const log = await prisma.attendanceLog.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
      update: {
        firstIn: parsedFirstIn,
        lastOut: parsedLastOut,
        workingHours,
        status,
      },
      create: {
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
            shift: true,
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
    const { month, year, departmentId, branchId } = req.query;

    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;
    const targetYear = parseInt(year as string) || new Date().getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);
    const daysInMonth = endOfMonth.getDate();

    // Build employee filter
    const employeeWhere: any = { isActive: true };
    if (departmentId) employeeWhere.departmentId = departmentId as string;
    if (branchId) employeeWhere.branchId = branchId as string;

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        shift: true,
        branch: {
          include: {
            location: true
          }
        },
      },
      orderBy: { firstName: 'asc' },
    });

    // Get all attendance logs for the month
    const logs = await prisma.attendanceLog.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        employeeId: {
          in: employees.map(e => e.id),
        },
      },
    });

    // Get holidays for the month
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
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

    holidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear) {
        holidayDays.add(d.getDate());
        holidayNames.set(d.getDate(), h.name);
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

    // Group logs by employee and date
    const logsByEmployee = new Map();
    for (const log of logs) {
      const dateKey = log.date.getDate();
      if (!logsByEmployee.has(log.employeeId)) {
        logsByEmployee.set(log.employeeId, new Map());
      }
      logsByEmployee.get(log.employeeId).set(dateKey, log);
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
          if (log.status === 'present') presentDays++;
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
          location: employee.branch?.location?.name || 'N/A',
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
      if (d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear) {
        formattedHolidays.push({
          day: d.getDate(),
          name: h.name,
          isRecurring: h.isRecurring,
        });
      }
    });

    recurringHolidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getMonth() + 1 === targetMonth) {
        formattedHolidays.push({
          day: d.getDate(),
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

export default router;
