"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Helper function to get attendance data
async function getAttendanceData(filters) {
    const { startDate, endDate, departmentId, branchId, employeeId } = filters;
    const where = {
        date: {
            gte: (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate)),
            lte: (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate)),
        },
    };
    let employeeWhere = {};
    if (departmentId)
        employeeWhere.departmentId = departmentId;
    if (branchId)
        employeeWhere.branchId = branchId;
    if (employeeId)
        employeeWhere.id = employeeId;
    if (Object.keys(employeeWhere).length > 0) {
        where.employee = employeeWhere;
    }
    const logs = await database_1.prisma.attendanceLog.findMany({
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
        orderBy: [
            { date: 'desc' },
            { employee: { firstName: 'asc' } },
        ],
    });
    return logs;
}
// Daily report
router.get('/daily', async (req, res) => {
    try {
        const { date, departmentId, branchId, employeeId, format = 'json' } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];
        const logs = await getAttendanceData({
            startDate: reportDate,
            endDate: reportDate,
            departmentId: departmentId,
            branchId: branchId,
            employeeId: employeeId,
        });
        if (format === 'excel') {
            return generateExcelReport(logs, `Daily_Report_${reportDate}`, res);
        }
        if (format === 'pdf') {
            return generatePDFReport(logs, `Daily Attendance Report - ${reportDate}`, res);
        }
        res.json({
            date: reportDate,
            totalRecords: logs.length,
            present: logs.filter(l => l.status === 'present').length,
            absent: logs.filter(l => l.status === 'absent').length,
            late: logs.filter(l => l.lateArrival > 0).length,
            earlyDeparture: logs.filter(l => l.earlyDeparture > 0).length,
            logs,
        });
    }
    catch (error) {
        console.error('Daily report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Weekly report
router.get('/weekly', async (req, res) => {
    try {
        const { startDate, departmentId, branchId, employeeId, format = 'json' } = req.query;
        const reportStartDate = startDate
            ? (0, date_fns_1.parseISO)(startDate)
            : (0, date_fns_1.startOfWeek)(new Date(), { weekStartsOn: 1 });
        const reportEndDate = (0, date_fns_1.endOfWeek)(reportStartDate, { weekStartsOn: 1 });
        const logs = await getAttendanceData({
            startDate: reportStartDate.toISOString(),
            endDate: reportEndDate.toISOString(),
            departmentId: departmentId,
            branchId: branchId,
            employeeId: employeeId,
        });
        if (format === 'excel') {
            return generateExcelReport(logs, `Weekly_Report_${reportStartDate.toISOString().split('T')[0]}`, res);
        }
        if (format === 'pdf') {
            return generatePDFReport(logs, `Weekly Attendance Report`, res);
        }
        // Group by employee
        const employeeStats = new Map();
        for (const log of logs) {
            const empId = log.employeeId;
            if (!employeeStats.has(empId)) {
                employeeStats.set(empId, {
                    employee: log.employee,
                    present: 0,
                    absent: 0,
                    late: 0,
                    earlyDeparture: 0,
                    totalWorkingHours: 0,
                    days: [],
                });
            }
            const stats = employeeStats.get(empId);
            stats.days.push(log);
            if (log.status === 'present')
                stats.present++;
            if (log.status === 'absent')
                stats.absent++;
            if (log.lateArrival > 0)
                stats.late++;
            if (log.earlyDeparture > 0)
                stats.earlyDeparture++;
            stats.totalWorkingHours += log.workingHours || 0;
        }
        res.json({
            startDate: reportStartDate,
            endDate: reportEndDate,
            totalRecords: logs.length,
            employeeStats: Array.from(employeeStats.values()),
        });
    }
    catch (error) {
        console.error('Weekly report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Monthly report
router.get('/monthly', async (req, res) => {
    try {
        const { month, year, departmentId, branchId, employeeId, format = 'json' } = req.query;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();
        const reportStartDate = (0, date_fns_1.startOfMonth)(new Date(targetYear, targetMonth - 1));
        const reportEndDate = (0, date_fns_1.endOfMonth)(new Date(targetYear, targetMonth - 1));
        const logs = await getAttendanceData({
            startDate: reportStartDate.toISOString(),
            endDate: reportEndDate.toISOString(),
            departmentId: departmentId,
            branchId: branchId,
            employeeId: employeeId,
        });
        if (format === 'excel') {
            return generateExcelReport(logs, `Monthly_Report_${targetYear}_${targetMonth.toString().padStart(2, '0')}`, res);
        }
        if (format === 'pdf') {
            return generatePDFReport(logs, `Monthly Attendance Report - ${targetMonth}/${targetYear}`, res);
        }
        // Group by employee
        const employeeStats = new Map();
        for (const log of logs) {
            const empId = log.employeeId;
            if (!employeeStats.has(empId)) {
                employeeStats.set(empId, {
                    employee: log.employee,
                    present: 0,
                    absent: 0,
                    late: 0,
                    earlyDeparture: 0,
                    totalWorkingHours: 0,
                    days: [],
                });
            }
            const stats = employeeStats.get(empId);
            stats.days.push(log);
            if (log.status === 'present')
                stats.present++;
            if (log.status === 'absent')
                stats.absent++;
            if (log.lateArrival > 0)
                stats.late++;
            if (log.earlyDeparture > 0)
                stats.earlyDeparture++;
            stats.totalWorkingHours += log.workingHours || 0;
        }
        res.json({
            month: targetMonth,
            year: targetYear,
            startDate: reportStartDate,
            endDate: reportEndDate,
            totalRecords: logs.length,
            employeeStats: Array.from(employeeStats.values()),
        });
    }
    catch (error) {
        console.error('Monthly report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Generate Excel report
async function generateExcelReport(logs, filename, res) {
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');
    // Define columns
    worksheet.columns = [
        { header: 'Employee Code', key: 'employeeCode', width: 15 },
        { header: 'Employee Name', key: 'employeeName', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Branch', key: 'branch', width: 15 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'First IN', key: 'firstIn', width: 12 },
        { header: 'Last OUT', key: 'lastOut', width: 12 },
        { header: 'Working Hours', key: 'workingHours', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Late (min)', key: 'lateArrival', width: 12 },
        { header: 'Early Out (min)', key: 'earlyDeparture', width: 15 },
    ];
    // Add rows
    for (const log of logs) {
        worksheet.addRow({
            employeeCode: log.employee?.employeeCode || '',
            employeeName: log.employee
                ? `${log.employee.firstName} ${log.employee.lastName}`
                : '',
            department: log.employee?.department?.name || '',
            branch: log.employee?.branch?.name || '',
            date: new Date(log.date).toLocaleDateString(),
            firstIn: log.firstIn
                ? new Date(log.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-',
            lastOut: log.lastOut
                ? new Date(log.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-',
            workingHours: log.workingHours ? log.workingHours.toFixed(2) : '-',
            status: log.status,
            lateArrival: log.lateArrival > 0 ? log.lateArrival : '-',
            earlyDeparture: log.earlyDeparture > 0 ? log.earlyDeparture : '-',
        });
    }
    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
    };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
}
// Generate PDF report
function generatePDFReport(logs, title, res) {
    const doc = new pdfkit_1.default({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report.pdf`);
    doc.pipe(res);
    // Title
    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown();
    // Table header
    const tableTop = 100;
    const colWidth = 70;
    const rowHeight = 20;
    doc.fontSize(10);
    doc.font('Helvetica-Bold');
    doc.text('Emp Code', 30, tableTop);
    doc.text('Name', 100, tableTop);
    doc.text('Date', 200, tableTop, { width: 60 });
    doc.text('First IN', 260, tableTop);
    doc.text('Last OUT', 330, tableTop);
    doc.text('Hours', 400, tableTop);
    doc.text('Status', 460, tableTop);
    doc.moveTo(30, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    // Table rows
    doc.font('Helvetica');
    let y = tableTop + 25;
    for (const log of logs.slice(0, 100)) {
        if (y > 750) {
            doc.addPage();
            y = 50;
        }
        const employeeName = log.employee
            ? `${log.employee.firstName} ${log.employee.lastName}`.substring(0, 15)
            : '';
        doc.text(log.employee?.employeeCode || '', 30, y);
        doc.text(employeeName, 100, y);
        doc.text(new Date(log.date).toLocaleDateString(), 200, y, { width: 60 });
        doc.text(log.firstIn ? new Date(log.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-', 260, y);
        doc.text(log.lastOut ? new Date(log.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-', 330, y);
        doc.text(log.workingHours ? log.workingHours.toFixed(2) : '-', 400, y);
        doc.text(log.status, 460, y);
        y += rowHeight;
    }
    if (logs.length > 100) {
        doc.moveDown(2);
        doc.text(`... and ${logs.length - 100} more records`, 30, y);
    }
    doc.end();
}
exports.default = router;
//# sourceMappingURL=reports.js.map