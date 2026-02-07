import { prisma, basePrisma } from '../config/database'; // We need basePrisma for global counts
import express from 'express';
import { authenticate } from '../middleware/auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const router = express.Router();

router.use(authenticate);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const user = (req as any).user;

    // ------------------------------------------------------------------
    // SUPER ADMIN DASHBOARD LOGIC (Global Stats)
    // ------------------------------------------------------------------
    if (user.role === 'superadmin') {
      const totalTenants = await basePrisma.tenant.count();
      const activeTenants = await basePrisma.tenant.count({ where: { isActive: true } });
      const totalUsers = await basePrisma.user.count();
      const totalEmployees = await basePrisma.employee.count();

      const tenants = await basePrisma.tenant.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              employees: true,
              devices: true
            }
          }
        }
      });

      const tenantData = tenants.map(t => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        status: t.isActive ? 'Active' : 'Inactive',
        userCount: t._count.users,
        employeeCount: t._count.employees,
        deviceCount: t._count.devices,
        createdAt: t.createdAt
      }));

      return res.json({
        type: 'superadmin',
        counts: {
          totalTenants,
          activeTenants,
          totalUsers,
          totalEmployees
        },
        tenants: tenantData
      });
    }

    // ------------------------------------------------------------------
    // REGULAR ADMIN/MANAGER DASHBOARD LOGIC (Tenant Scoped)
    // ------------------------------------------------------------------

    // Use IST today for dashboard stats
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const today = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // Initialize defaults
    let totalEmployees = 0;
    let activeEmployees = 0;
    let totalDepartments = 0;
    let totalBranches = 0;
    let yesterdayAttendance = 0;
    let devicesCount = 0;
    let todayStatus = { present: 0, absent: 0 };
    let absentEmployees: any[] = [];
    let lateArrivals = 0;
    let lastSync = null;
    let pendingLeaves = 0;

    // Execute queries sequentially to prevent total failure
    // Note: 'prisma' client here automatically scopes to tenantId via middleware/extensions
    try {
      totalEmployees = await prisma.employee.count();
      activeEmployees = await prisma.employee.count({ where: { status: 'active' } });
    } catch (e) { console.error('Employee count error', e); }

    try {
      totalDepartments = await prisma.department.count();
      totalBranches = await prisma.branch.count();
      devicesCount = await prisma.device.count();
    } catch (e) { console.error('Org count error', e); }

    try {
      const yesterdayLogs = await prisma.attendanceLog.groupBy({
        by: ['employeeId'],
        where: {
          date: {
            gte: yesterday,
            lt: today
          },
          status: { in: ['Present', 'present', 'Half Day', 'half day', 'Late', 'late'] },
          employee: { status: 'active' }
        }
      });
      yesterdayAttendance = yesterdayLogs.length;
    } catch (e) { console.error('Yesterday att error', e); }

    try {
      // Today's Status: Count unique ACTIVE employees who have a log for today
      // Using groupBy to ensure we count unique employees even if duplicate logs exist
      const todayLogs = await prisma.attendanceLog.groupBy({
        by: ['employeeId'],
        where: {
          date: {
            gte: today, // Exactly 2026-02-07 00:00:00 UTC
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Before 2026-02-08 00:00:00 UTC
          },
          status: { in: ['Present', 'present', 'Half Day', 'half day', 'Late', 'late'] },
          employee: { status: 'active' }
        }
      });

      const presentCount = todayLogs.length;

      // Calculate Absent as Active - Present
      const absentCount = Math.max(0, activeEmployees - presentCount);

      todayStatus = { present: presentCount, absent: absentCount };
    } catch (e) { console.error('Today status error', e); }

    try {
      pendingLeaves = await prisma.leaveEntry.count({
        where: { status: 'pending' }
      });
    } catch (e) { console.error('Pending leaves error', e); }

    try {
      absentEmployees = await prisma.attendanceLog.findMany({
        where: {
          date: today,
          status: { in: ['Absent', 'absent'] },
          employee: { status: 'active' }
        },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        take: 20
      }).then(logs => logs.map(l => l.employee));
    } catch (e) { console.error('Absent list error', e); }

    try {
      lateArrivals = await prisma.attendanceLog.count({
        where: {
          date: today,
          lateArrival: { gt: 0 },
          employee: { status: 'active' }
        }
      });
    } catch (e) { console.error('Late arrivals error', e); }

    try {
      lastSync = await prisma.syncLog.findFirst({ orderBy: { createdAt: 'desc' } });
    } catch (e) { console.error('Sync status error', e); }

    // ------------------------------------------------------------------
    // SCHOOL STATS (If applicable)
    // ------------------------------------------------------------------
    let schoolStats = null;
    const tenant = await basePrisma.tenant.findUnique({ where: { id: user.tenantId } });

    if (tenant?.type === 'SCHOOL') {
      try {
        const studentCount = await prisma.student.count();
        const courseCount = await prisma.course.count();
        const batchCount = await prisma.batch.count();

        // Student Attendance Today
        const studentsPresent = await prisma.studentAttendance.count({
          where: { date: { gte: today }, status: 'PRESENT' }
        });
        const studentsAbsent = await prisma.studentAttendance.count({
          where: { date: { gte: today }, status: 'ABSENT' }
        });

        schoolStats = {
          totalStudents: studentCount,
          totalCourses: courseCount,
          totalBatches: batchCount,
          attendance: {
            present: studentsPresent,
            absent: studentsAbsent
          }
        };
      } catch (e) { console.error('School stats error', e); }
    }

    res.json({
      type: 'admin',
      tenantType: tenant?.type,
      counts: {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalBranches,
        devicesCount,
        pendingLeaves,
      },
      schoolStats,
      today: {
        present: todayStatus.present,
        absent: todayStatus.absent,
        absentEmployees,
        lateArrivals,
        attendanceRate: activeEmployees > 0 ? Math.round((todayStatus.present / activeEmployees) * 100) : 0,
      },
      yesterdayAttendance,
      lastSync,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const today = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));

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
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const date = new Date(now.getTime() + istOffset);
      date.setUTCDate(date.getUTCDate() - i);
      const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

      const nextDate = new Date(targetDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      const [present, absent, late] = await Promise.all([
        prisma.attendanceLog.count({
          where: {
            date: { gte: targetDate, lt: nextDate },
            status: { in: ['Present', 'present', 'Half Day', 'half day'] },
          },
        }),
        prisma.attendanceLog.count({
          where: {
            date: { gte: targetDate, lt: nextDate },
            status: { in: ['Absent', 'absent'] },
          },
        }),
        prisma.attendanceLog.count({
          where: {
            date: { gte: targetDate, lt: nextDate },
            lateArrival: { gt: 0 },
          },
        }),
      ]);

      data.push({
        date: targetDate.toISOString().split('T')[0],
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
