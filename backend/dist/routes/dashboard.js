"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = (0, date_fns_1.subDays)(today, 1);
        // Get counts
        const [totalEmployees, activeEmployees, totalDepartments, totalBranches, todayAttendance, yesterdayAttendance, devicesCount,] = await Promise.all([
            database_1.prisma.employee.count(),
            database_1.prisma.employee.count({ where: { isActive: true } }),
            database_1.prisma.department.count(),
            database_1.prisma.branch.count(),
            database_1.prisma.attendanceLog.count({
                where: {
                    date: { gte: today },
                    status: 'present',
                },
            }),
            database_1.prisma.attendanceLog.count({
                where: {
                    date: { gte: yesterday, lt: today },
                    status: 'present',
                },
            }),
            database_1.prisma.device.count({ where: { isActive: true } }),
        ]);
        // Get today's status breakdown
        const todayStats = await database_1.prisma.attendanceLog.groupBy({
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
            if (stat.status === 'present')
                todayStatus.present = stat._count.status;
            if (stat.status === 'absent')
                todayStatus.absent = stat._count.status;
        }
        // Get late arrivals today
        const lateArrivals = await database_1.prisma.attendanceLog.count({
            where: {
                date: { gte: today },
                lateArrival: { gt: 0 },
            },
        });
        // Get recent sync status
        const lastSync = await database_1.prisma.syncStatus.findFirst({
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
                lateArrivals,
                attendanceRate: totalEmployees > 0 ? Math.round((todayStatus.present / totalEmployees) * 100) : 0,
            },
            yesterdayAttendance,
            lastSync: lastSync || null,
        });
    }
    catch (error) {
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
        const recentCheckins = await database_1.prisma.attendanceLog.findMany({
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
        const recentCheckouts = await database_1.prisma.attendanceLog.findMany({
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
    }
    catch (error) {
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
            const date = (0, date_fns_1.subDays)(new Date(), i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const [present, absent, late] = await Promise.all([
                database_1.prisma.attendanceLog.count({
                    where: {
                        date: { gte: date, lt: nextDate },
                        status: 'present',
                    },
                }),
                database_1.prisma.attendanceLog.count({
                    where: {
                        date: { gte: date, lt: nextDate },
                        status: 'absent',
                    },
                }),
                database_1.prisma.attendanceLog.count({
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
    }
    catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map