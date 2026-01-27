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
// Get attendance logs
router.get('/', async (req, res) => {
    try {
        const { employeeId, departmentId, branchId, startDate, endDate, status, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (status)
            where.status = status;
        if (startDate && endDate) {
            where.date = {
                gte: (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate)),
                lte: (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate)),
            };
        }
        else if (startDate) {
            where.date = {
                gte: (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate)),
            };
        }
        let employeeWhere = {};
        if (departmentId)
            employeeWhere.departmentId = departmentId;
        if (branchId)
            employeeWhere.branchId = branchId;
        if (Object.keys(employeeWhere).length > 0) {
            where.employee = employeeWhere;
        }
        const [logs, total] = await Promise.all([
            database_1.prisma.attendanceLog.findMany({
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
            database_1.prisma.attendanceLog.count({ where }),
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
    }
    catch (error) {
        console.error('Get attendance logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get attendance summary for an employee
router.get('/summary/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();
        const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
        const endOfMonth = new Date(targetYear, targetMonth, 0);
        const logs = await database_1.prisma.attendanceLog.findMany({
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
    }
    catch (error) {
        console.error('Get attendance summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get today's attendance
router.get('/today/all', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const logs = await database_1.prisma.attendanceLog.findMany({
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
    }
    catch (error) {
        console.error('Get today attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Manual attendance entry/update
router.post('/manual', async (req, res) => {
    try {
        const { employeeId, date, firstIn, lastOut, status } = req.body;
        const attendanceDate = (0, date_fns_1.parseISO)(date);
        const parsedFirstIn = firstIn ? new Date(firstIn) : null;
        const parsedLastOut = lastOut ? new Date(lastOut) : null;
        let workingHours = null;
        if (parsedFirstIn && parsedLastOut) {
            const diffMs = parsedLastOut.getTime() - parsedFirstIn.getTime();
            workingHours = diffMs / (1000 * 60 * 60);
        }
        const log = await database_1.prisma.attendanceLog.upsert({
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
    }
    catch (error) {
        console.error('Manual attendance entry error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=attendance.js.map