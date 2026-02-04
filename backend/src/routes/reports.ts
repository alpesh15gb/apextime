import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = express.Router();

router.use(authenticate);

// DEBUG ENDPOINT - Inspect raw records for an employee code
router.get('/debug/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { employeeCode: code }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const logs = await prisma.attendanceLog.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: 'desc' },
      take: 20
    });

    const rawLogs = await prisma.rawDeviceLog.findMany({
      where: { userId: employee.deviceUserId || employee.employeeCode },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    res.json({
      employee,
      attendanceLogs: logs,
      rawDeviceLogs: rawLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to get attendance data
async function getAttendanceData(filters: any) {
  const { startDate, endDate, departmentId, branchId, employeeId } = filters;

  const where: any = {
    date: {
      gte: startOfDay(parseISO(startDate)),
      lte: endOfDay(parseISO(endDate)),
    },
  };

  let employeeWhere: any = {};
  if (departmentId) employeeWhere.departmentId = departmentId;
  if (branchId) employeeWhere.branchId = branchId;
  if (employeeId) employeeWhere.id = employeeId;

  if (Object.keys(employeeWhere).length > 0) {
    where.employee = employeeWhere;
  }

  const logs = await prisma.attendanceLog.findMany({
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

  console.log(`[REPORT DEBUG] Found ${logs.length} logs for range ${startDate} to ${endDate}`);
  if (logs.length > 0) {
    console.log(`[REPORT DEBUG] Sample Log Date: ${logs[0].date.toISOString()} Status: ${logs[0].status}`);
  }

  return logs;
}

// Daily report
router.get('/daily', async (req, res) => {
  try {
    const { date, departmentId, branchId, employeeId, format = 'json' } = req.query;

    const reportDate = (date as string) || new Date().toISOString().split('T')[0];

    const logs = await getAttendanceData({
      startDate: reportDate,
      endDate: reportDate,
      departmentId: departmentId as string | undefined,
      branchId: branchId as string | undefined,
      employeeId: employeeId as string | undefined,
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
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Weekly report
router.get('/weekly', async (req, res) => {
  try {
    const { startDate, departmentId, branchId, employeeId, format = 'json' } = req.query;

    const reportStartDate = startDate
      ? parseISO(startDate as string)
      : startOfWeek(new Date(), { weekStartsOn: 1 });

    const reportEndDate = endOfWeek(reportStartDate, { weekStartsOn: 1 });

    const logs = await getAttendanceData({
      startDate: reportStartDate.toISOString(),
      endDate: reportEndDate.toISOString(),
      departmentId: departmentId as string | undefined,
      branchId: branchId as string | undefined,
      employeeId: employeeId as string | undefined,
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
      if (log.status === 'present') stats.present++;
      if (log.status === 'absent') stats.absent++;
      if (log.lateArrival > 0) stats.late++;
      if (log.earlyDeparture > 0) stats.earlyDeparture++;
      stats.totalWorkingHours += log.workingHours || 0;
    }

    res.json({
      startDate: reportStartDate,
      endDate: reportEndDate,
      totalRecords: logs.length,
      employeeStats: Array.from(employeeStats.values()),
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly report
router.get('/monthly', async (req, res) => {
  try {
    const { month, year, departmentId, branchId, employeeId, format = 'json' } = req.query;

    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;
    const targetYear = parseInt(year as string) || new Date().getFullYear();

    const reportStartDate = startOfMonth(new Date(targetYear, targetMonth - 1));
    const reportEndDate = endOfMonth(new Date(targetYear, targetMonth - 1));

    const logs = await getAttendanceData({
      startDate: reportStartDate.toISOString(),
      endDate: reportEndDate.toISOString(),
      departmentId: departmentId as string | undefined,
      branchId: branchId as string | undefined,
      employeeId: employeeId as string | undefined,
    });

    if (format === 'excel') {
      return generateExcelReport(
        logs,
        `Monthly_Report_${targetYear}_${targetMonth.toString().padStart(2, '0')}`,
        res
      );
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
      if (log.status === 'present') stats.present++;
      if (log.status === 'absent') stats.absent++;
      if (log.lateArrival > 0) stats.late++;
      if (log.earlyDeparture > 0) stats.earlyDeparture++;
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
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate Excel report
async function generateExcelReport(logs: any[], filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
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
function generatePDFReport(logs: any[], title: string, res: express.Response) {
  const doc = new PDFDocument({ margin: 30 });

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
    doc.text(
      log.firstIn ? new Date(log.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      260,
      y
    );
    doc.text(
      log.lastOut ? new Date(log.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      330,
      y
    );
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

// Student Attendance Report
router.get('/student_attendance', async (req, res) => {
  try {
    const { startDate, endDate, format = 'excel' } = req.query;
    const tenantId = (req as any).user?.tenantId;

    const attendance = await prisma.studentAttendance.findMany({
      where: {
        tenantId,
        date: {
          gte: startOfDay(parseISO(startDate as string)),
          lte: endOfDay(parseISO(endDate as string)),
        },
      },
      include: {
        student: {
          include: { batch: { include: { course: true } } }
        }
      },
      orderBy: { date: 'desc' }
    });

    if (format === 'excel') {
      return generateStudentExcelReport(attendance, `Student_Attendance_${startDate}`, res);
    }
    res.json(attendance);
  } catch (error) {
    console.error('Student attendance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fee Collection Report
router.get('/fee_report', async (req, res) => {
  try {
    const { startDate, endDate, format = 'excel' } = req.query;
    const tenantId = (req as any).user?.tenantId;

    const fees = await prisma.feeRecord.findMany({
      where: {
        tenantId,
        updatedAt: {
          gte: startOfDay(parseISO(startDate as string)),
          lte: endOfDay(parseISO(endDate as string)),
        },
        paidAmount: { gt: 0 }
      },
      include: {
        student: {
          include: { batch: { include: { course: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (format === 'excel') {
      return generateFeeExcelReport(fees, `Fee_Report_${startDate}`, res);
    }
    res.json(fees);
  } catch (error) {
    console.error('Fee report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper for Student Excel
async function generateStudentExcelReport(records: any[], filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Student Attendance');

  worksheet.columns = [
    { header: 'Admission #', key: 'admissionNo', width: 15 },
    { header: 'Student Name', key: 'studentName', width: 25 },
    { header: 'Class', key: 'class', width: 15 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Remarks', key: 'remarks', width: 20 },
  ];

  for (const rec of records) {
    worksheet.addRow({
      admissionNo: rec.student?.admissionNo,
      studentName: `${rec.student?.firstName} ${rec.student?.lastName}`,
      class: rec.student?.batch?.course?.name,
      section: rec.student?.batch?.name,
      date: new Date(rec.date).toLocaleDateString(),
      status: rec.status,
      remarks: rec.remarks || '-',
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

async function generateFeeExcelReport(records: any[], filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fee Collection');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Admission #', key: 'admissionNo', width: 15 },
    { header: 'Student Name', key: 'studentName', width: 25 },
    { header: 'Invoice Title', key: 'title', width: 25 },
    { header: 'Total Amount', key: 'amount', width: 15 },
    { header: 'Paid Amount', key: 'paid', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  for (const rec of records) {
    worksheet.addRow({
      date: new Date(rec.updatedAt).toLocaleDateString(),
      admissionNo: rec.student?.admissionNo,
      studentName: `${rec.student?.firstName} ${rec.student?.lastName}`,
      title: rec.title,
      amount: rec.amount,
      paid: rec.paidAmount,
      status: rec.status,
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

export default router;
