import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const router = express.Router();

router.use(authenticate);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = subDays(today, 1);

    // Get counts
    const [
      totalEmployees,
      activeEmployees,
      totalDepartments,
      totalBranches,
      todayAttendance,
      yesterdayAttendance,
      devicesCount,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { isActive: true } }),
      prisma.department.count(),
      prisma.branch.count(),
      prisma.attendanceLog.count({
        where: {
          date: { gte: today },
          status: 'present',
        },
      }),
      prisma.attendanceLog.count({
        where: {
          date: { gte: yesterday, lt: today },
          status: 'present',
        },
      }),
      prisma.device.count({ where: { isActive: true } }),
    ]);

    // Get today's status breakdown
    const todayStats = await prisma.attendanceLog.groupBy({
      by: ['status'],
      where: {
        date: { gte: today },
      },
      _count: {
        status: true,
      },
    });

    const todayStatus = {
      present: 0,
      absent: 0,
    };

    for (const stat of todayStats) {
      if (stat.status === 'present') todayStatus.present = stat._count.status;
      if (stat.status === 'absent') {
        // Re-verify absent count for active employees only to be safe
        const activeAbsentCount = await prisma.attendanceLog.count({
          where: {
            date: { gte: today },
            status: 'absent',
            employee: { isActive: true }
          }
        });
        todayStatus.absent = activeAbsentCount;
      }
    }

    // Get absent employees list
    const absentEmployees = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: today },
        status: 'absent',
        employee: { isActive: true }
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
      take: 20, // Limit to 20 for dashboard summary
    });

    // Get late arrivals today
    const lateArrivals = await prisma.attendanceLog.count({
      where: {
        date: { gte: today },
        lateArrival: { gt: 0 },
      },
    });

    // Get recent sync status
    const lastSync = await prisma.syncStatus.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      counts: {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalBranches,
        devicesCount,
      },
      today: {
        present: todayStatus.present,
        absent: todayStatus.absent,
        absentEmployees: absentEmployees.map(a => a.employee),
        lateArrivals,
        attendanceRate: totalEmployees > 0 ? Math.round((todayStatus.present / totalEmployees) * 100) : 0,
      },
      yesterdayAttendance,
      lastSync: lastSync || null,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Recent check-ins
    const recentCheckins = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: today },
        firstIn: { not: null },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: { firstIn: 'desc' },
      take: 10,
    });

    // Recent check-outs
    const recentCheckouts = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: today },
        lastOut: { not: null },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: { lastOut: 'desc' },
      take: 10,
    });

    res.json({
      recentCheckins,
      recentCheckouts,
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance chart data
router.get('/chart-data', async (req, res) => {
  try {
    const days = 7;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [present, absent, late] = await Promise.all([
        prisma.attendanceLog.count({
          where: {
            date: { gte: date, lt: nextDate },
            status: 'present',
          },
        }),
        prisma.attendanceLog.count({
          where: {
            date: { gte: date, lt: nextDate },
            status: 'absent',
          },
        }),
        prisma.attendanceLog.count({
          where: {
            date: { gte: date, lt: nextDate },
            lateArrival: { gt: 0 },
          },
        }),
      ]);

      data.push({
        date: date.toISOString().split('T')[0],
        present,
        absent,
        late,
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
