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

export default router;
