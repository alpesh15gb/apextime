import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = express.Router();

router.use(authenticate);

// Helper to get company branding
async function getBranding(tenantId?: string) {
  const profile = tenantId
    ? await prisma.companyProfile.findFirst({ where: { tenantId } })
    : await prisma.companyProfile.findFirst();
  return profile || {
    name: 'Apextime Enterprises',
    logo: null,
    address: ''
  };
}

/**
 * Helper function to get attendance data with proper filtering
 * 
 * FIXED: Proper location filtering that includes employees from branches
 *        assigned to the selected location
 */
async function getAttendanceData(filters: any) {
  const { startDate, endDate, departmentId, branchId, locationId, employeeId, tenantId } = filters;

  // Parse dates - dates come as YYYY-MM-DD strings
  // For @db.Date columns, we use UTC midnight
  const startDateObj = new Date(startDate + 'T00:00:00Z');
  const endDateObj = new Date(endDate + 'T23:59:59.999Z');

  // Build employee filter
  const employeeWhere: any = {
    tenantId,
    isActive: true
  };

  if (employeeId) {
    employeeWhere.id = employeeId;
  }

  if (departmentId) {
    employeeWhere.departmentId = departmentId;
  }

  if (branchId) {
    employeeWhere.branchId = branchId;
  }

  // FIXED: Location filter - include employees directly assigned to location
  // OR employees whose branch is assigned to this location
  if (locationId) {
    employeeWhere.OR = [
      { locationId: locationId },
      { branch: { locationId: locationId } }
    ];
  }

  // First get filtered employee IDs
  const filteredEmployees = await prisma.employee.findMany({
    where: employeeWhere,
    select: { id: true }
  });

  const employeeIds = filteredEmployees.map(e => e.id);

  if (employeeIds.length === 0) {
    console.log(`[REPORT DEBUG] No employees match the filters`);
    return [];
  }

  // Now query attendance logs for these employees
  const logs = await prisma.attendanceLog.findMany({
    where: {
      tenantId,
      employeeId: { in: employeeIds },
      date: {
        gte: startDateObj,
        lte: endDateObj,
      },
    },
    include: {
      employee: {
        include: {
          department: true,
          branch: true,
          shift: true,
          location: true,
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { employee: { firstName: 'asc' } },
    ],
  });

  console.log(`[REPORT DEBUG] Found ${logs.length} logs for range ${startDate} to ${endDate}, ${employeeIds.length} employees`);

  return logs;
}

/**
 * Format time for display in IST
 */
function formatTimeIST(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Format date for display in IST
 */
function formatDateIST(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

// Daily report
router.get('/daily', async (req, res) => {
  try {
    const { date, departmentId, branchId, locationId, employeeId, format = 'json' } = req.query;

    // Default to today in IST
    const today = new Date();
    const todayIST = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD format
    const reportDate = (date as string) || todayIST;

    const logs = await getAttendanceData({
      startDate: reportDate,
      endDate: reportDate,
      departmentId: departmentId as string | undefined,
      branchId: branchId as string | undefined,
      locationId: locationId as string | undefined,
      employeeId: employeeId as string | undefined,
      tenantId: (req as any).user.tenantId
    });

    if (format === 'excel') {
      return generateExcelReport(logs, `Daily_Report_${reportDate}`, res);
    }

    if (format === 'pdf') {
      return generatePDFReport(logs, `Daily Attendance Report - ${reportDate}`, res, {
        startDate: reportDate,
        endDate: reportDate
      });
    }

    const present = logs.filter(l => l.status?.toLowerCase() === 'present').length;
    const absent = logs.filter(l => l.status?.toLowerCase() === 'absent').length;
    const late = logs.filter(l => (l.lateArrival || 0) > 0).length;
    const earlyDep = logs.filter(l => (l.earlyDeparture || 0) > 0).length;
    const halfDay = logs.filter(l => l.status?.toLowerCase() === 'half day').length;
    const incomplete = logs.filter(l => l.status?.toLowerCase() === 'shift incomplete').length;

    // Department breakdown
    const deptBreakdown: Record<string, any> = {};
    for (const log of logs) {
      const dName = log.employee?.department?.name || 'Unassigned';
      if (!deptBreakdown[dName]) {
        deptBreakdown[dName] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      deptBreakdown[dName].total++;
      if (log.status?.toLowerCase() === 'present') deptBreakdown[dName].present++;
      if (log.status?.toLowerCase() === 'absent') deptBreakdown[dName].absent++;
      if ((log.lateArrival || 0) > 0) deptBreakdown[dName].late++;
    }

    res.json({
      date: reportDate,
      totalRecords: logs.length,
      summary: {
        present,
        absent,
        late,
        earlyDeparture: earlyDep,
        halfDay,
        incomplete,
        totalWorkingHours: Math.round(logs.reduce((acc, l) => acc + (l.workingHours || 0), 0) * 100) / 100,
        avgWorkingHours: logs.length > 0 ? Math.round((logs.reduce((acc, l) => acc + (l.workingHours || 0), 0) / logs.length) * 100) / 100 : 0
      },
      departmentBreakdown: Object.entries(deptBreakdown).map(([name, stats]) => ({ name, ...stats as any })),
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
    const { startDate, departmentId, branchId, locationId, employeeId, format = 'json' } = req.query;

    const reportStartDate = startDate
      ? parseISO(startDate as string)
      : startOfWeek(new Date(), { weekStartsOn: 1 });

    const reportEndDate = endOfWeek(reportStartDate, { weekStartsOn: 1 });

    const logs = await getAttendanceData({
      startDate: reportStartDate.toISOString().split('T')[0],
      endDate: reportEndDate.toISOString().split('T')[0],
      departmentId: departmentId as string | undefined,
      branchId: branchId as string | undefined,
      locationId: locationId as string | undefined,
      employeeId: employeeId as string | undefined,
      tenantId: (req as any).user.tenantId,
    });

    if (format === 'excel') {
      return generateExcelReport(logs, `Weekly_Report_${reportStartDate.toISOString().split('T')[0]}`, res);
    }

    if (format === 'pdf') {
      return generatePDFReport(logs, `Weekly Attendance Report`, res, {
        startDate: reportStartDate.toISOString().split('T')[0],
        endDate: reportEndDate.toISOString().split('T')[0]
      });
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
          halfDay: 0,
          incomplete: 0,
          totalWorkingHours: 0,
          days: [],
        });
      }

      const stats = employeeStats.get(empId);
      stats.days.push(log);
      const status = (log.status || '').toLowerCase();
      if (status === 'present') stats.present++;
      if (status === 'absent') stats.absent++;
      if (status === 'half day') stats.halfDay++;
      if (status === 'shift incomplete') stats.incomplete++;
      if ((log.lateArrival || 0) > 0) stats.late++;
      if ((log.earlyDeparture || 0) > 0) stats.earlyDeparture++;
      stats.totalWorkingHours += log.workingHours || 0;
    }

    // Daily trend data for charts
    const dailyTrend: Record<string, any> = {};
    for (const log of logs) {
      const dayKey = new Date(log.date).toISOString().split('T')[0];
      if (!dailyTrend[dayKey]) {
        dailyTrend[dayKey] = { date: dayKey, present: 0, absent: 0, late: 0, total: 0 };
      }
      dailyTrend[dayKey].total++;
      const s = (log.status || '').toLowerCase();
      if (s === 'present') dailyTrend[dayKey].present++;
      if (s === 'absent') dailyTrend[dayKey].absent++;
      if ((log.lateArrival || 0) > 0) dailyTrend[dayKey].late++;
    }

    res.json({
      startDate: reportStartDate,
      endDate: reportEndDate,
      totalRecords: logs.length,
      summary: {
        totalPresent: logs.filter(l => (l.status || '').toLowerCase() === 'present').length,
        totalAbsent: logs.filter(l => (l.status || '').toLowerCase() === 'absent').length,
        totalLate: logs.filter(l => (l.lateArrival || 0) > 0).length,
        totalWorkingHours: Math.round(logs.reduce((a, l) => a + (l.workingHours || 0), 0) * 100) / 100,
        avgWorkingHours: logs.length > 0 ? Math.round((logs.reduce((a, l) => a + (l.workingHours || 0), 0) / logs.length) * 100) / 100 : 0,
        uniqueEmployees: employeeStats.size
      },
      dailyTrend: Object.values(dailyTrend).sort((a: any, b: any) => a.date.localeCompare(b.date)),
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
    const { month, year, departmentId, branchId, locationId, employeeId, format = 'json' } = req.query;

    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;
    const targetYear = parseInt(year as string) || new Date().getFullYear();

    const reportStartDate = startOfMonth(new Date(targetYear, targetMonth - 1));
    const reportEndDate = endOfMonth(new Date(targetYear, targetMonth - 1));

    const logs = await getAttendanceData({
      startDate: reportStartDate.toISOString().split('T')[0],
      endDate: reportEndDate.toISOString().split('T')[0],
      departmentId: departmentId as string | undefined,
      branchId: branchId as string | undefined,
      locationId: locationId as string | undefined,
      employeeId: employeeId as string | undefined,
      tenantId: (req as any).user.tenantId,
    });

    if (format === 'excel') {
      return generateExcelReport(
        logs,
        `Monthly_Report_${targetYear}_${targetMonth.toString().padStart(2, '0')}`,
        res
      );
    }

    if (format === 'pdf') {
      return generatePDFReport(logs, `Monthly Status Report`, res, {
        startDate: reportStartDate.toISOString().split('T')[0],
        endDate: reportEndDate.toISOString().split('T')[0]
      });
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
          halfDay: 0,
          incomplete: 0,
          totalWorkingHours: 0,
          days: [],
        });
      }

      const stats = employeeStats.get(empId);
      stats.days.push(log);
      const status = (log.status || '').toLowerCase();
      if (status === 'present') stats.present++;
      if (status === 'absent') stats.absent++;
      if (status === 'half day') stats.halfDay++;
      if (status === 'shift incomplete') stats.incomplete++;
      if ((log.lateArrival || 0) > 0) stats.late++;
      if ((log.earlyDeparture || 0) > 0) stats.earlyDeparture++;
      stats.totalWorkingHours += log.workingHours || 0;
    }

    // Daily trend for charts
    const dailyTrend: Record<string, any> = {};
    for (const log of logs) {
      const dayKey = new Date(log.date).toISOString().split('T')[0];
      if (!dailyTrend[dayKey]) {
        dailyTrend[dayKey] = { date: dayKey, present: 0, absent: 0, late: 0, total: 0 };
      }
      dailyTrend[dayKey].total++;
      const s = (log.status || '').toLowerCase();
      if (s === 'present') dailyTrend[dayKey].present++;
      if (s === 'absent') dailyTrend[dayKey].absent++;
      if ((log.lateArrival || 0) > 0) dailyTrend[dayKey].late++;
    }

    // Department breakdown
    const deptBreakdown: Record<string, any> = {};
    for (const log of logs) {
      const dName = log.employee?.department?.name || 'Unassigned';
      if (!deptBreakdown[dName]) deptBreakdown[dName] = { present: 0, absent: 0, late: 0, total: 0 };
      deptBreakdown[dName].total++;
      if ((log.status || '').toLowerCase() === 'present') deptBreakdown[dName].present++;
      if ((log.status || '').toLowerCase() === 'absent') deptBreakdown[dName].absent++;
      if ((log.lateArrival || 0) > 0) deptBreakdown[dName].late++;
    }

    res.json({
      month: targetMonth,
      year: targetYear,
      startDate: reportStartDate,
      endDate: reportEndDate,
      totalRecords: logs.length,
      summary: {
        totalPresent: logs.filter(l => (l.status || '').toLowerCase() === 'present').length,
        totalAbsent: logs.filter(l => (l.status || '').toLowerCase() === 'absent').length,
        totalLate: logs.filter(l => (l.lateArrival || 0) > 0).length,
        totalHalfDay: logs.filter(l => (l.status || '').toLowerCase() === 'half day').length,
        totalWorkingHours: Math.round(logs.reduce((a, l) => a + (l.workingHours || 0), 0) * 100) / 100,
        avgWorkingHours: logs.length > 0 ? Math.round((logs.reduce((a, l) => a + (l.workingHours || 0), 0) / logs.length) * 100) / 100 : 0,
        uniqueEmployees: employeeStats.size
      },
      dailyTrend: Object.values(dailyTrend).sort((a: any, b: any) => a.date.localeCompare(b.date)),
      departmentBreakdown: Object.entries(deptBreakdown).map(([name, stats]) => ({ name, ...stats as any })),
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
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'First IN', key: 'firstIn', width: 12 },
    { header: 'Last OUT', key: 'lastOut', width: 12 },
    { header: 'Working Hours', key: 'workingHours', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Late (min)', key: 'lateArrival', width: 12 },
    { header: 'Early Out (min)', key: 'earlyDeparture', width: 15 },
    { header: 'Punch Records', key: 'punchRecords', width: 40 },
  ];

  // Add rows
  for (const log of logs) {
    worksheet.addRow({
      employeeCode: log.employee?.employeeCode || '',
      employeeName: log.employee
        ? `${log.employee.firstName} ${log.employee.lastName || ''}`
        : '',
      department: log.employee?.department?.name || '',
      branch: log.employee?.branch?.name || '',
      location: log.employee?.location?.name || log.employee?.branch?.location?.name || '',
      date: formatDateIST(log.date),
      firstIn: formatTimeIST(log.firstIn),
      lastOut: formatTimeIST(log.lastOut),
      workingHours: log.workingHours ? log.workingHours.toFixed(2) : '-',
      status: log.status || 'Absent',
      lateArrival: log.lateArrival > 0 ? Math.round(log.lateArrival * 60) : '-',
      earlyDeparture: log.earlyDeparture > 0 ? Math.round(log.earlyDeparture * 60) : '-',
      punchRecords: log.logs ? (() => {
        try {
          const punches = JSON.parse(log.logs);
          return punches.map((t: string) => formatTimeIST(new Date(t))).join(', ');
        } catch { return '-'; }
      })() : '-'
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
async function generatePDFReport(logs: any[], title: string, res: express.Response, options: any = {}) {
  const tenantId = logs[0]?.employee?.tenantId;
  const branding = await getBranding(tenantId);
  const doc = new PDFDocument({ margin: 30, layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_report.pdf`);

  doc.pipe(res);

  // HEADER SECTION
  let headerY = 30;

  // Logo placeholder or image
  if (branding.logo && branding.logo.startsWith('data:image')) {
    try {
      const base64Data = branding.logo.split(';base64,').pop();
      if (base64Data) {
        doc.image(Buffer.from(base64Data, 'base64'), 30, headerY, { width: 80 });
      }
    } catch (e) {
      doc.rect(30, headerY, 80, 40).stroke();
      doc.fontSize(8).text('LOGO', 55, headerY + 15);
    }
  } else {
    doc.rect(30, headerY, 80, 40).stroke();
    doc.fontSize(8).text('LOGO', 55, headerY + 15);
  }

  // Title and branding
  doc.fontSize(16).font('Helvetica-Bold').text(title, 0, headerY, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`${options.startDate || ''} To ${options.endDate || ''}`, 0, headerY + 20, { align: 'center' });

  doc.fontSize(10).font('Helvetica-Bold').text(`Company:  ${branding.name}`, 30, headerY + 60);
  doc.fontSize(8).font('Helvetica').text(`Printed On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 600, headerY + 60, { align: 'right' });

  doc.moveTo(30, headerY + 75).lineTo(760, headerY + 75).stroke();

  // Table header
  const tableTop = headerY + 90;
  const col = {
    sno: 30,
    code: 55,
    name: 110,
    shift: 210,
    sin: 245,
    sout: 290,
    ain: 335,
    aout: 380,
    work: 425,
    ot: 470,
    tot: 515,
    late: 560,
    early: 605,
    status: 650,
    records: 710
  };

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('SNo', col.sno, tableTop);
  doc.text('E. Code', col.code, tableTop);
  doc.text('Name', col.name, tableTop);
  doc.text('Shift', col.shift, tableTop);
  doc.text('S. InTime', col.sin, tableTop);
  doc.text('S. OutTime', col.sout, tableTop);
  doc.text('A. InTime', col.ain, tableTop);
  doc.text('A. OutTime', col.aout, tableTop);
  doc.text('Work Dur.', col.work, tableTop);
  doc.text('OT', col.ot, tableTop);
  doc.text('Tot. Dur.', col.tot, tableTop);
  doc.text('LateBy', col.late, tableTop);
  doc.text('EarlyGoingBy', col.early, tableTop);
  doc.text('Status', col.status, tableTop);
  doc.text('Punches', col.records, tableTop);

  doc.moveTo(30, tableTop + 12).lineTo(760, tableTop + 12).stroke();

  // Table rows
  doc.font('Helvetica').fontSize(7);
  let y = tableTop + 20;

  logs.forEach((log, index) => {
    if (y > 500) {
      doc.addPage({ layout: 'landscape' });
      y = 50;
    }

    const emp = log.employee;
    const shift = emp?.shift;

    doc.text((index + 1).toString(), col.sno, y);
    doc.text(emp?.employeeCode || '-', col.code, y);
    doc.text(`${emp?.firstName || ''} ${emp?.lastName || ''}`.substring(0, 20), col.name, y);
    doc.text(shift?.code || 'GS', col.shift, y);

    // Shift Times (from shift data or default)
    const shiftStart = shift?.startTime ? formatTimeIST(new Date(`2000-01-01T${shift.startTime}`)) : '09:30';
    const shiftEnd = shift?.endTime ? formatTimeIST(new Date(`2000-01-01T${shift.endTime}`)) : '18:30';
    doc.text(shiftStart, col.sin, y);
    doc.text(shiftEnd, col.sout, y);

    doc.text(formatTimeIST(log.firstIn), col.ain, y);
    doc.text(formatTimeIST(log.lastOut), col.aout, y);

    doc.text(log.workingHours ? log.workingHours.toFixed(2) : '00:00', col.work, y);
    doc.text('00:00', col.ot, y);
    doc.text(log.workingHours ? log.workingHours.toFixed(2) : '00:00', col.tot, y);

    doc.text(log.lateArrival > 0 ? Math.round(log.lateArrival * 60).toString() : '0', col.late, y);
    doc.text(log.earlyDeparture > 0 ? Math.round(log.earlyDeparture * 60).toString() : '0', col.early, y);

    doc.text(log.status || 'Absent', col.status, y);

    // Punch sequence
    if (log.logs) {
      try {
        const pArr = JSON.parse(log.logs);
        const pStr = pArr.map((t: string) => formatTimeIST(new Date(t))).join(', ');
        doc.fontSize(6).text(pStr, col.records, y, { width: 50 });
        doc.fontSize(7);
      } catch (e) { }
    }

    y += 15;
    doc.moveTo(30, y - 2).lineTo(760, y - 2).lineWidth(0.5).dash(2, { space: 2 }).stroke().undash().lineWidth(1);
  });

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
      date: formatDateIST(rec.date),
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
      date: formatDateIST(rec.updatedAt),
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

// Generic redirect for download endpoints
router.get('/:type/download/:format', async (req, res) => {
  const { type, format } = req.params;
  const { startDate, endDate, date, departmentId, branchId, locationId, employeeId } = req.query;
  const tenantId = (req as any).user.tenantId;

  let start = (startDate || date) as string;
  let end = (endDate || date) as string;

  // Fallback if only month and year are provided
  if (!start && req.query.month && req.query.year) {
    const m = parseInt(req.query.month as string);
    const y = parseInt(req.query.year as string);
    start = new Date(y, m - 1, 1).toISOString().split('T')[0];
    end = new Date(y, m, 0).toISOString().split('T')[0];
  }

  // Default to today if no dates provided
  if (!start) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    start = today;
    end = today;
  }

  const filterParams = {
    startDate: start,
    endDate: end || start,
    tenantId,
    departmentId: departmentId as string | undefined,
    branchId: branchId as string | undefined,
    locationId: locationId as string | undefined,
    employeeId: employeeId as string | undefined
  };

  if (type === 'daily' || type === 'daily_detailed') {
    const logs = await getAttendanceData(filterParams);
    if (format === 'excel') return generateExcelReport(logs, `Daily_Report_${start}`, res);
    return generatePDFReport(logs, `Daily Attendance (Detailed)`, res, { startDate: start, endDate: end });
  }

  if (type === 'monthly' || type === 'monthly_detailed') {
    const logs = await getAttendanceData(filterParams);
    if (format === 'excel') return generateExcelReport(logs, `Monthly_Report_${start}`, res);
    return generatePDFReport(logs, `Monthly Attendance Report`, res, { startDate: start, endDate: end });
  }

  if (type === 'leave_summary') {
    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(departmentId ? { departmentId: departmentId as string } : {}),
        ...(branchId ? { branchId: branchId as string } : {}),
        ...(locationId ? {
          OR: [
            { locationId: locationId as string },
            { branch: { locationId: locationId as string } }
          ]
        } : {}),
      },
      include: {
        leaveBalances: true,
        department: true
      }
    });
    if (format === 'excel') return generateLeaveExcelReport(employees, `Leave_Summary`, res);
    return generateLeavePDFReport(employees, `Leave Summary Report`, res);
  }

  if (type === 'department_summary') {
    const logs = await getAttendanceData(filterParams);
    const summary = groupDepartmentSummary(logs);
    if (format === 'excel') return generateDeptExcelReport(summary, `Dept_Summary`, res);
    return generateDeptPDFReport(summary, `Department Summary Report`, res, { startDate: start, endDate: end });
  }

  if (type === 'monthly_matrix') {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();
    const matrixRes = await fetchMatrixData(m, y, departmentId as string, branchId as string, locationId as string, tenantId);

    if (format === 'excel') return generateMatrixExcelReport(matrixRes, `Monthly_Matrix_${m}_${y}`, res);
    return generateMatrixPDFReport(matrixRes, `Employee Attendance Sheet`, res);
  }

  if (type === 'yearly_attendance') {
    const { year } = req.query;
    const y = parseInt(year as string) || new Date().getFullYear();
    const yearlyRes = await fetchYearlyData(y, departmentId as string, branchId as string, locationId as string, tenantId);
    if (format === 'excel') return generateYearlyExcelReport(yearlyRes, `Yearly_Attendance_${y}`, res);
    return generateYearlyPDFReport(yearlyRes, `Yearly Attendance Record - ${y}`, res);
  }

  if (type === 'full_forms') {
    const logs = await getAttendanceData(filterParams);
    if (format === 'excel') return generateExcelReport(logs, `Full_Form_Report`, res);
    return generatePDFReport(logs, `Attendance Full Form`, res, { startDate: start, endDate: end });
  }

  res.status(404).json({ error: 'Report type not supported' });
});

async function fetchYearlyData(year: number, departmentId: string, branchId: string, locationId: string, tenantId: string) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  // Build employee filter
  const employeeWhere: any = {
    tenantId,
    isActive: true,
    ...(departmentId ? { departmentId } : {}),
    ...(branchId ? { branchId } : {})
  };

  if (locationId) {
    employeeWhere.OR = [
      { locationId },
      { branch: { locationId } }
    ];
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
  });

  const logs = await prisma.attendanceLog.findMany({
    where: { tenantId, date: { gte: start, lte: end }, employeeId: { in: employees.map(e => e.id) } },
    select: { employeeId: true, date: true, status: true }
  });

  return { year, employees, logs };
}

async function generateYearlyPDFReport(data: any, title: string, res: express.Response) {
  const branding = await getBranding();
  const doc = new PDFDocument({ margin: 30, layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text(branding.name, { align: 'center' });
  doc.fontSize(12).text(title, { align: 'center' });
  doc.moveTo(30, 70).lineTo(760, 70).stroke();

  let y = 90;
  data.employees.forEach((emp: any) => {
    if (y > 500) { doc.addPage({ layout: 'landscape' }); y = 50; }
    doc.fontSize(10).font('Helvetica-Bold').text(`${emp.employeeCode} - ${emp.firstName} ${emp.lastName || ''}`, 30, y);
    y += 15;

    // Monthly summaries
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    doc.fontSize(8);
    months.forEach((m, i) => {
      const mLogs = data.logs.filter((l: any) => l.employeeId === emp.id && new Date(l.date).getUTCMonth() === i);
      const present = mLogs.filter((l: any) => l.status?.toLowerCase() === 'present').length;
      doc.text(`${m}: ${present}P`, 40 + (i * 60), y);
    });
    y += 20;
    doc.moveTo(30, y - 5).lineTo(760, y - 5).dash(1, { space: 1 }).stroke().undash();
    y += 10;
  });

  doc.end();
}

async function generateYearlyExcelReport(data: any, filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Yearly Attendance');
  ws.columns = [
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Jan', key: 'm0', width: 6 },
    { header: 'Feb', key: 'm1', width: 6 },
    { header: 'Mar', key: 'm2', width: 6 },
    { header: 'Apr', key: 'm3', width: 6 },
    { header: 'May', key: 'm4', width: 6 },
    { header: 'Jun', key: 'm5', width: 6 },
    { header: 'Jul', key: 'm6', width: 6 },
    { header: 'Aug', key: 'm7', width: 6 },
    { header: 'Sep', key: 'm8', width: 6 },
    { header: 'Oct', key: 'm9', width: 6 },
    { header: 'Nov', key: 'm10', width: 6 },
    { header: 'Dec', key: 'm11', width: 6 }
  ];

  data.employees.forEach((emp: any) => {
    const row: any = { code: emp.employeeCode, name: `${emp.firstName} ${emp.lastName || ''}` };
    for (let i = 0; i < 12; i++) {
      row[`m${i}`] = data.logs.filter((l: any) => l.employeeId === emp.id && new Date(l.date).getUTCMonth() === i && l.status?.toLowerCase() === 'present').length;
    }
    ws.addRow(row);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

async function fetchMatrixData(month: number, year: number, departmentId: string, branchId: string, locationId: string, tenantId: string) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build employee filter
  const employeeWhere: any = {
    tenantId,
    isActive: true,
    ...(departmentId ? { departmentId } : {}),
    ...(branchId ? { branchId } : {})
  };

  if (locationId) {
    employeeWhere.OR = [
      { locationId },
      { branch: { locationId } }
    ];
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: { department: true, branch: true },
    orderBy: { firstName: 'asc' }
  });

  const logs = await prisma.attendanceLog.findMany({
    where: { tenantId, date: { gte: start, lte: end }, employeeId: { in: employees.map(e => e.id) } }
  });

  const holidays = await prisma.holiday.findMany({
    where: { tenantId, date: { gte: start, lte: end } }
  });

  return { month, year, daysInMonth, employees, logs, holidays };
}

async function generateMatrixPDFReport(data: any, title: string, res: express.Response) {
  const branding = await getBranding();
  const doc = new PDFDocument({ margin: 20, layout: 'landscape', size: 'A3' });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  const TEAL = '#297972';

  // Header Box
  doc.rect(20, 20, doc.page.width - 40, 50).fill(TEAL);
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text(branding.name || 'Your Company Name', 0, 30, { align: 'center' });
  doc.fontSize(12).text(title, 0, 52, { align: 'center' });

  // Info Row
  doc.fillColor('black').fontSize(8).font('Helvetica');
  let y = 80;
  const monthName = new Date(2000, data.month - 1).toLocaleString('default', { month: 'long' });
  doc.text(`Year: ${data.year}`, 25, y);
  doc.text(`Month: ${monthName}`, 80, y);

  const today = new Date();
  if (data.month === today.getMonth() + 1 && data.year === today.getFullYear()) {
    doc.text(`As of: ${today.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 150, y);
  }

  // Table Header
  y = 100;
  const colWidths = { id: 40, name: 110, month: 45, days: 27, stats: 25 };
  doc.rect(20, y, doc.page.width - 40, 25).fill('#e0f2f1');
  doc.fontSize(10).fillColor(TEAL).font('Helvetica-Bold');
  doc.text('Emp. ID', 25, y + 8);
  doc.text('Employee Name', 65, y + 8);
  doc.text('Month', 175, y + 8);

  let dayX = 220;
  for (let i = 1; i <= data.daysInMonth; i++) {
    doc.text(i.toString(), dayX, y + 8, { width: colWidths.days, align: 'center' });
    dayX += colWidths.days;
  }
  doc.text('P', dayX, y + 8, { width: colWidths.stats, align: 'center' });
  doc.text('A', dayX + colWidths.stats, y + 8, { width: colWidths.stats, align: 'center' });
  doc.text('L', dayX + colWidths.stats * 2, y + 8, { width: colWidths.stats, align: 'center' });

  y += 25;
  doc.font('Helvetica').fontSize(10).fillColor('black');

  data.employees.forEach((emp: any) => {
    if (y > doc.page.height - 80) { doc.addPage({ layout: 'landscape', size: 'A3' }); y = 40; }

    doc.text(emp.employeeCode, 25, y);
    doc.text(`${emp.firstName} ${emp.lastName || ''}`.substring(0, 25), 65, y);
    doc.text(monthName.substring(0, 3), 175, y);

    let dX = 220;
    let pCount = 0, aCount = 0, lCount = 0;

    for (let d = 1; d <= data.daysInMonth; d++) {
      const log = data.logs.find((l: any) => l.employeeId === emp.id && new Date(l.date).getUTCDate() === d);
      const dayDate = new Date(Date.UTC(data.year, data.month - 1, d));
      const isSun = dayDate.getUTCDay() === 0;

      let row1 = '-';
      let color = '#333333';

      if (log) {
        row1 = log.firstIn ? formatTimeIST(log.firstIn) : 'P';
        pCount++;
        if (log.lateArrival > 0) {
          lCount++;
          color = '#cc6600';
        }
      } else if (isSun) {
        row1 = 'WO';
        color = TEAL;
      } else {
        row1 = 'A';
        aCount++;
        color = '#cc0000';
      }

      doc.fillColor(color).fontSize(8).text(row1, dX, y - 2, { width: colWidths.days, align: 'center' });
      doc.fontSize(10);
      dX += colWidths.days;
    }

    doc.fillColor('black');
    doc.text(pCount.toString(), dX, y + 4, { width: colWidths.stats, align: 'center' });
    doc.text(aCount.toString(), dX + colWidths.stats, y + 4, { width: colWidths.stats, align: 'center' });
    doc.text(lCount.toString(), dX + colWidths.stats * 2, y + 4, { width: colWidths.stats, align: 'center' });

    y += 28;
    doc.moveTo(20, y - 2).lineTo(doc.page.width - 20, y - 2).strokeColor('#eeeeee').lineWidth(0.5).stroke();
  });

  doc.end();
}

function groupDepartmentSummary(logs: any[]) {
  const groups: any = {};
  logs.forEach(log => {
    const dateKey = formatDateIST(log.date);
    const deptName = log.employee?.department?.name || 'Default';

    if (!groups[dateKey]) groups[dateKey] = {};
    if (!groups[dateKey][deptName]) {
      groups[dateKey][deptName] = { P: 0, A: 0, H: 0, HP: 0, WO: 0, WOP: 0, OD: 0, OT: 0, Late: 0, Early: 0, Total: 0 };
    }

    const stats = groups[dateKey][deptName];
    stats.Total++;
    const status = (log.status || '').toLowerCase();
    if (status === 'present') stats.P++;
    else if (status === 'absent') stats.A++;
    else if (status.includes('holiday')) stats.H++;
    else if (status.includes('off')) stats.WO++;

    if ((log.lateArrival || 0) > 0) stats.Late++;
    if ((log.earlyDeparture || 0) > 0) stats.Early++;
  });
  return groups;
}

async function generateMatrixExcelReport(data: any, filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Monthly Matrix');

  const TEAL = 'FF297972';

  // Columns
  const cols: any[] = [
    { header: 'Emp Code', key: 'code', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
  ];
  for (let i = 1; i <= data.daysInMonth; i++) {
    cols.push({ header: i.toString(), key: `d${i}`, width: 8 });
  }
  cols.push({ header: 'P', key: 'p', width: 5 });
  cols.push({ header: 'A', key: 'a', width: 5 });
  cols.push({ header: 'L', key: 'l', width: 5 });

  ws.columns = cols;

  // Header Style
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center' };
  });

  data.employees.forEach((emp: any) => {
    const rowData: any = { code: emp.employeeCode, name: `${emp.firstName} ${emp.lastName || ''}` };
    let p = 0, a = 0, l = 0;

    for (let d = 1; d <= data.daysInMonth; d++) {
      const log = data.logs.find((lg: any) => lg.employeeId === emp.id && new Date(lg.date).getUTCDate() === d);
      const dayDate = new Date(Date.UTC(data.year, data.month - 1, d));
      const isSun = dayDate.getUTCDay() === 0;

      if (log) {
        const inStr = log.firstIn ? formatTimeIST(log.firstIn) : 'P';
        const outStr = log.lastOut ? formatTimeIST(log.lastOut) : '';
        rowData[`d${d}`] = inStr + (outStr ? '\n' + outStr : '');
        p++;
        if (log.lateArrival > 0) l++;
      } else if (isSun) {
        rowData[`d${d}`] = 'WO';
      } else {
        rowData[`d${d}`] = 'A';
        a++;
      }
    }
    rowData.p = p; rowData.a = a; rowData.l = l;

    const row = ws.addRow(rowData);

    // Style the row cells
    row.height = 30;
    for (let d = 1; d <= data.daysInMonth; d++) {
      const cell = row.getCell(2 + d);
      const val = cell.value?.toString() || '';
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

      if (val === 'A') {
        cell.font = { color: { argb: 'FFFF0000' } };
      } else if (val === 'WO') {
        cell.font = { color: { argb: 'FF0000FF' } };
      }
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

async function generateLeavePDFReport(employees: any[], title: string, res: express.Response) {
  const branding = await getBranding();
  const doc = new PDFDocument({ margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Company: ${branding.name}`, 30, 60);
  doc.moveTo(30, 75).lineTo(550, 75).stroke();

  let y = 100;
  employees.forEach(emp => {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.fontSize(10).font('Helvetica-Bold').text(`Employee: ${emp.employeeCode} - ${emp.firstName} ${emp.lastName || ''}`, 30, y);
    y += 15;

    doc.fontSize(8);
    doc.text('Leave Type', 40, y);
    doc.text('Allowed', 150, y);
    doc.text('Taken', 250, y);
    doc.text('Balance', 350, y);
    doc.moveTo(40, y + 10).lineTo(450, y + 10).stroke();
    y += 18;

    const balances = emp.leaveBalances || [];
    if (balances.length === 0) {
      doc.text('No leave data available', 40, y);
      y += 15;
    } else {
      balances.forEach((b: any) => {
        doc.text(b.code, 40, y);
        doc.text(b.total.toString(), 150, y);
        doc.text(b.used.toString(), 250, y);
        doc.text(b.balance.toString(), 350, y);
        y += 12;
      });
    }
    y += 20;
  });
  doc.end();
}

async function generateDeptPDFReport(summary: any, title: string, res: express.Response, opts: any) {
  const branding = await getBranding();
  const doc = new PDFDocument({ margin: 30, layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.fontSize(10).text(`${opts.startDate} To ${opts.endDate}`, { align: 'center' });
  doc.fontSize(10).font('Helvetica-Bold').text(`Company: ${branding.name}`, 30, 60);
  doc.moveTo(30, 75).lineTo(760, 75).stroke();

  let y = 90;
  Object.keys(summary).forEach(date => {
    if (y > 500) { doc.addPage({ layout: 'landscape' }); y = 50; }
    doc.fontSize(10).font('Helvetica-Bold').text(`Attendance Date: ${date}`, 30, y);
    y += 15;

    doc.fontSize(8);
    const cols = [30, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480];
    const labels = ['Dept Name', 'P', 'A', 'H', 'HP', 'WO', 'WOP', 'On Leave', 'On OD', 'On OT', 'Late', 'Early', 'Tot. Emp'];
    labels.forEach((l, i) => doc.text(l, cols[i], y));
    doc.moveTo(30, y + 10).lineTo(760, y + 10).stroke();
    y += 15;

    const depts = summary[date];
    Object.keys(depts).forEach(dName => {
      const s = depts[dName];
      doc.text(dName, cols[0], y);
      doc.text(s.P.toString(), cols[1], y);
      doc.text(s.A.toString(), cols[2], y);
      doc.text(s.H.toString(), cols[3], y);
      doc.text(s.HP.toString(), cols[4], y);
      doc.text(s.WO.toString(), cols[5], y);
      doc.text(s.WOP.toString(), cols[6], y);
      doc.text('0', cols[7], y);
      doc.text(s.OD.toString(), cols[8], y);
      doc.text(s.OT.toString(), cols[9], y);
      doc.text(s.Late.toString(), cols[10], y);
      doc.text(s.Early.toString(), cols[11], y);
      doc.text(s.Total.toString(), cols[12], y);
      y += 12;
    });
    y += 20;
    doc.moveTo(30, y - 5).lineTo(760, y - 5).dash(1, { space: 1 }).stroke().undash();
    y += 10;
  });
  doc.end();
}

async function generateLeaveExcelReport(employees: any[], filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Leave Summary');
  ws.columns = [
    { header: 'Emp Code', key: 'code', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Leave Type', key: 'type', width: 15 },
    { header: 'Allowed', key: 'allowed', width: 10 },
    { header: 'Taken', key: 'taken', width: 10 },
    { header: 'Balance', key: 'balance', width: 10 }
  ];
  employees.forEach(e => {
    const bals = e.leaveBalances || [];
    if (bals.length === 0) {
      ws.addRow({ code: e.employeeCode, name: `${e.firstName} ${e.lastName || ''}`, type: '-', allowed: 0, taken: 0, balance: 0 });
    } else {
      bals.forEach((b: any) => {
        ws.addRow({ code: e.employeeCode, name: `${e.firstName} ${e.lastName || ''}`, type: b.code, allowed: b.total, taken: b.used, balance: b.balance });
      });
    }
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

async function generateDeptExcelReport(summary: any, filename: string, res: express.Response) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Dept Summary');
  ws.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Department', key: 'dept', width: 20 },
    { header: 'Present', key: 'p', width: 8 },
    { header: 'Absent', key: 'a', width: 8 },
    { header: 'Late', key: 'late', width: 8 },
    { header: 'Total', key: 'total', width: 8 }
  ];
  Object.keys(summary).forEach(date => {
    Object.keys(summary[date]).forEach(dept => {
      const s = summary[date][dept];
      ws.addRow({ date, dept, p: s.P, a: s.A, late: s.Late, total: s.Total });
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

export default router;
