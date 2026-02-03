const express = require('express');
const router = express.Router();
const AttendanceCalculationService = require('../services/AttendanceCalculationService');

const calculationService = new AttendanceCalculationService();

/**
 * POST /api/attendance/recalculate
 * Recalculate attendance for a date range
 * 
 * Body:
 * {
 *   "startDate": "2025-12-01",
 *   "endDate": "2025-12-31",
 *   "employeeIds": ["id1", "id2"] // Optional
 * }
 */
router.post('/recalculate', async (req, res) => {
    try {
        const { startDate, endDate, employeeIds } = req.body;
        const tenantId = req.user.tenantId;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T23:59:59.999Z');

        const result = await calculationService.recalculateAttendance(
            tenantId,
            start,
            end,
            employeeIds
        );

        res.json({
            success: true,
            message: 'Attendance recalculated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error recalculating attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recalculate attendance',
            error: error.message
        });
    }
});

/**
 * GET /api/attendance/detailed
 * Get detailed attendance report with all punches
 * 
 * Query params:
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 * - employeeId: Optional
 * - departmentId: Optional
 * - status: Optional (Present, Absent, Late, Half Day)
 */
router.get('/detailed', async (req, res) => {
    try {
        const { startDate, endDate, employeeId, departmentId, status } = req.query;
        const tenantId = req.user.tenantId;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const where = {
            tenantId,
            date: {
                gte: new Date(startDate + 'T00:00:00.000Z'),
                lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (status) {
            where.status = status;
        }

        const logs = await req.prisma.attendanceLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        designation: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { date: 'asc' },
                { employee: { employeeCode: 'asc' } }
            ]
        });

        // Filter by department if specified
        let filteredLogs = logs;
        if (departmentId) {
            filteredLogs = logs.filter(log => log.employee.department?.id === departmentId);
        }

        // Parse logs JSON and format response
        const detailedLogs = filteredLogs.map(log => ({
            id: log.id,
            date: log.date,
            employee: {
                id: log.employee.id,
                code: log.employee.employeeCode,
                name: `${log.employee.firstName} ${log.employee.lastName}`,
                department: log.employee.department?.name,
                designation: log.employee.designation?.name
            },
            firstIn: log.firstIn,
            lastOut: log.lastOut,
            totalHours: log.totalHours,
            workingHours: log.workingHours,
            lateArrival: log.lateArrival,
            earlyDeparture: log.earlyDeparture,
            status: log.status,
            totalPunches: log.totalPunches,
            punches: log.logs ? JSON.parse(log.logs) : [],
            shiftStart: log.shiftStart,
            shiftEnd: log.shiftEnd
        }));

        res.json({
            success: true,
            data: detailedLogs,
            count: detailedLogs.length
        });
    } catch (error) {
        console.error('Error fetching detailed attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch detailed attendance',
            error: error.message
        });
    }
});

/**
 * GET /api/attendance/exceptions
 * Get exception report (Late, Early Departure, Absent)
 * 
 * Query params:
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 * - type: late|early|absent|all
 * - departmentId: Optional
 */
router.get('/exceptions', async (req, res) => {
    try {
        const { startDate, endDate, type = 'all', departmentId } = req.query;
        const tenantId = req.user.tenantId;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const where = {
            tenantId,
            date: {
                gte: new Date(startDate + 'T00:00:00.000Z'),
                lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        // Filter by exception type
        if (type === 'late') {
            where.lateArrival = { gt: 0 };
        } else if (type === 'early') {
            where.earlyDeparture = { gt: 0 };
        } else if (type === 'absent') {
            where.status = 'Absent';
        } else if (type === 'all') {
            where.OR = [
                { lateArrival: { gt: 0 } },
                { earlyDeparture: { gt: 0 } },
                { status: 'Absent' }
            ];
        }

        const logs = await req.prisma.attendanceLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        department: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        designation: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { date: 'desc' },
                { lateArrival: 'desc' }
            ]
        });

        // Filter by department if specified
        let filteredLogs = logs;
        if (departmentId) {
            filteredLogs = logs.filter(log => log.employee.department?.id === departmentId);
        }

        // Format response
        const exceptions = filteredLogs.map(log => {
            const exceptionTypes = [];
            if (log.lateArrival > 0) exceptionTypes.push('Late');
            if (log.earlyDeparture > 0) exceptionTypes.push('Early Departure');
            if (log.status === 'Absent') exceptionTypes.push('Absent');

            return {
                id: log.id,
                date: log.date,
                employee: {
                    id: log.employee.id,
                    code: log.employee.employeeCode,
                    name: `${log.employee.firstName} ${log.employee.lastName}`,
                    phone: log.employee.phone,
                    department: log.employee.department?.name,
                    designation: log.employee.designation?.name
                },
                exceptionTypes,
                firstIn: log.firstIn,
                lastOut: log.lastOut,
                shiftStart: log.shiftStart,
                shiftEnd: log.shiftEnd,
                lateArrival: log.lateArrival,
                lateArrivalMinutes: Math.round(log.lateArrival * 60),
                earlyDeparture: log.earlyDeparture,
                earlyDepartureMinutes: Math.round(log.earlyDeparture * 60),
                status: log.status,
                totalHours: log.totalHours
            };
        });

        res.json({
            success: true,
            data: exceptions,
            count: exceptions.length,
            summary: {
                totalExceptions: exceptions.length,
                lateArrivals: exceptions.filter(e => e.exceptionTypes.includes('Late')).length,
                earlyDepartures: exceptions.filter(e => e.exceptionTypes.includes('Early Departure')).length,
                absences: exceptions.filter(e => e.exceptionTypes.includes('Absent')).length
            }
        });
    } catch (error) {
        console.error('Error fetching exceptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exceptions',
            error: error.message
        });
    }
});

/**
 * GET /api/attendance/export/detailed
 * Export detailed attendance report to Excel
 */
router.get('/export/detailed', async (req, res) => {
    try {
        const ExcelExportService = require('../services/ExcelExportService');
        const excelService = new ExcelExportService();

        const { startDate, endDate, employeeId, departmentId, status } = req.query;
        const tenantId = req.user.tenantId;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const where = {
            tenantId,
            date: {
                gte: new Date(startDate + 'T00:00:00.000Z'),
                lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;

        const logs = await req.prisma.attendanceLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                        designation: { select: { name: true } }
                    }
                }
            },
            orderBy: [{ date: 'asc' }, { employee: { employeeCode: 'asc' } }]
        });

        let filteredLogs = logs;
        if (departmentId) {
            filteredLogs = logs.filter(log => log.employee.department?.id === departmentId);
        }

        const detailedLogs = filteredLogs.map(log => ({
            date: log.date,
            employee: {
                code: log.employee.employeeCode,
                name: `${log.employee.firstName} ${log.employee.lastName}`,
                department: log.employee.department?.name,
                designation: log.employee.designation?.name
            },
            firstIn: log.firstIn,
            lastOut: log.lastOut,
            totalHours: log.totalHours,
            workingHours: log.workingHours,
            lateArrival: log.lateArrival,
            earlyDeparture: log.earlyDeparture,
            status: log.status,
            totalPunches: log.totalPunches
        }));

        const workbook = await excelService.exportDetailedReport(detailedLogs, {
            title: 'Detailed Attendance Report',
            startDate,
            endDate
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Attendance_Detailed_${startDate}_to_${endDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting detailed report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export report',
            error: error.message
        });
    }
});

/**
 * GET /api/attendance/export/exceptions
 * Export exception report to Excel
 */
router.get('/export/exceptions', async (req, res) => {
    try {
        const ExcelExportService = require('../services/ExcelExportService');
        const excelService = new ExcelExportService();

        const { startDate, endDate, type = 'all', departmentId } = req.query;
        const tenantId = req.user.tenantId;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const where = {
            tenantId,
            date: {
                gte: new Date(startDate + 'T00:00:00.000Z'),
                lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        if (type === 'late') {
            where.lateArrival = { gt: 0 };
        } else if (type === 'early') {
            where.earlyDeparture = { gt: 0 };
        } else if (type === 'absent') {
            where.status = 'Absent';
        } else if (type === 'all') {
            where.OR = [
                { lateArrival: { gt: 0 } },
                { earlyDeparture: { gt: 0 } },
                { status: 'Absent' }
            ];
        }

        const logs = await req.prisma.attendanceLog.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        department: { select: { name: true } },
                        designation: { select: { name: true } }
                    }
                }
            },
            orderBy: [{ date: 'desc' }, { lateArrival: 'desc' }]
        });

        let filteredLogs = logs;
        if (departmentId) {
            filteredLogs = logs.filter(log => log.employee.department?.id === departmentId);
        }

        const exceptions = filteredLogs.map(log => {
            const exceptionTypes = [];
            if (log.lateArrival > 0) exceptionTypes.push('Late');
            if (log.earlyDeparture > 0) exceptionTypes.push('Early Departure');
            if (log.status === 'Absent') exceptionTypes.push('Absent');

            return {
                date: log.date,
                employee: {
                    code: log.employee.employeeCode,
                    name: `${log.employee.firstName} ${log.employee.lastName}`,
                    phone: log.employee.phone,
                    department: log.employee.department?.name
                },
                exceptionTypes,
                firstIn: log.firstIn,
                lastOut: log.lastOut,
                shiftStart: log.shiftStart,
                shiftEnd: log.shiftEnd,
                lateArrivalMinutes: Math.round(log.lateArrival * 60),
                earlyDepartureMinutes: Math.round(log.earlyDeparture * 60)
            };
        });

        const summary = {
            totalExceptions: exceptions.length,
            lateArrivals: exceptions.filter(e => e.exceptionTypes.includes('Late')).length,
            earlyDepartures: exceptions.filter(e => e.exceptionTypes.includes('Early Departure')).length,
            absences: exceptions.filter(e => e.exceptionTypes.includes('Absent')).length
        };

        const workbook = await excelService.exportExceptionReport(exceptions, {
            title: 'Attendance Exception Report',
            summary
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Attendance_Exceptions_${startDate}_to_${endDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting exception report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export report',
            error: error.message
        });
    }
});

module.exports = router;
