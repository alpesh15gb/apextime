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

    // OPERATIONAL LOGIC: A "Work Day" starts at 05:00 AM.
    // This aligns the dashboard with the biometric sync logic.
    const now = new Date();
    // Get IST time components properly
    const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istStr);
    const istHour = istDate.getHours();

    // Calculate Logical Today (if before 5 AM, it's still "Yesterday")
    let logicalToday = new Date(Date.UTC(istDate.getFullYear(), istDate.getMonth(), istDate.getDate()));
    if (istHour < 5) {
      logicalToday.setUTCDate(logicalToday.getUTCDate() - 1);
    }

    const logicalYesterday = new Date(logicalToday);
    logicalYesterday.setUTCDate(logicalYesterday.getUTCDate() - 1);

    // Initialize defaults
    let totalEmployees = 0;
    let activeEmployeesCount = 0;
    let totalDepartments = 0;
    let totalBranches = 0;
    let yesterdayAttendance = 0;
    let devicesCount = 0;
    let todayStatus = { present: 0, absent: 0, currentlyIn: 0 };
    let absentEmployees: any[] = [];
    let lateArrivals = 0;
    let lastSync = null;
    let pendingLeaves = 0;

    // Execute queries sequentially to prevent total failure
    try {
      totalEmployees = await prisma.employee.count();
      activeEmployeesCount = await prisma.employee.count({ where: { status: 'active' } });
    } catch (e) { console.error('Employee count error', e); }

    try {
      totalDepartments = await prisma.department.count();
      totalBranches = await prisma.branch.count();
      devicesCount = await prisma.device.count();
    } catch (e) { console.error('Org count error', e); }

    try {
      const yesterdayLogs = await prisma.attendanceLog.findMany({
        where: {
          date: logicalYesterday,
          status: { in: ['Present', 'present', 'Half Day', 'half day', 'Late', 'late', 'Shift Incomplete', 'shift incomplete'] },
          employee: { status: 'active' }
        },
        select: { employeeId: true },
        distinct: ['employeeId']
      });
      yesterdayAttendance = yesterdayLogs.length;
    } catch (e) { console.error('Yesterday att error', e); }

    try {
      // 1. Get Today's attendance logs (Logical Day)
      const todayLogs = await prisma.attendanceLog.findMany({
        where: {
          date: logicalToday,
          status: { in: ['Present', 'present', 'Half Day', 'half day', 'Late', 'late', 'Shift Incomplete', 'shift incomplete'] },
          employee: { status: 'active' }
        },
        select: { employeeId: true, lastOut: true }
      });

      // 2. Logic for counts
      const presentIds = new Set(todayLogs.map(l => l.employeeId));
      const currentlyInCount = todayLogs.filter(l => !l.lastOut).length;

      const presentCount = presentIds.size;
      const absentCount = Math.max(0, activeEmployeesCount - presentCount);

      todayStatus = {
        present: presentCount,
        absent: absentCount,
        currentlyIn: currentlyInCount
      };
    } catch (e) { console.error('Today status error', e); }

    try {
      pendingLeaves = await prisma.leaveEntry.count({
        where: { status: 'pending' }
      });
    } catch (e) { console.error('Pending leaves error', e); }

    try {
      absentEmployees = await prisma.attendanceLog.findMany({
        where: {
          date: logicalToday,
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
          date: logicalToday,
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
          where: { date: logicalToday, status: 'PRESENT' }
        });
        const studentsAbsent = await prisma.studentAttendance.count({
          where: { date: logicalToday, status: 'ABSENT' }
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
        activeEmployees: activeEmployeesCount,
        totalDepartments,
        totalBranches,
        devicesCount,
        pendingLeaves,
      },
      schoolStats,
      today: {
        present: todayStatus.present,
        absent: todayStatus.absent,
        currentlyIn: todayStatus.currentlyIn,
        absentEmployees,
        lateArrivals,
        attendanceRate: activeEmployeesCount > 0 ? Math.round((todayStatus.present / activeEmployeesCount) * 100) : 0,
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
    const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istStr);
    const istHour = istDate.getHours();

    let logicalToday = new Date(Date.UTC(istDate.getFullYear(), istDate.getMonth(), istDate.getDate()));
    if (istHour < 5) {
      logicalToday.setUTCDate(logicalToday.getUTCDate() - 1);
    }

    // Recent check-ins
    const recentCheckins = await prisma.attendanceLog.findMany({
      where: {
        date: logicalToday,
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
        date: logicalToday,
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

    const now = new Date();
    const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istStr);
    const istHour = istDate.getHours();

    // Base logical today
    let baseLogicalToday = new Date(Date.UTC(istDate.getFullYear(), istDate.getMonth(), istDate.getDate()));
    if (istHour < 5) {
      baseLogicalToday.setUTCDate(baseLogicalToday.getUTCDate() - 1);
    }

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(baseLogicalToday);
      targetDate.setUTCDate(targetDate.getUTCDate() - i);

      const [present, absent, late] = await Promise.all([
        prisma.attendanceLog.count({
          where: {
            date: targetDate,
            status: { in: ['Present', 'present', 'Half Day', 'half day', 'Shift Incomplete', 'shift incomplete'] },
          },
        }),
        prisma.attendanceLog.count({
          where: {
            date: targetDate,
            status: { in: ['Absent', 'absent'] },
          },
        }),
        prisma.attendanceLog.count({
          where: {
            date: targetDate,
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
