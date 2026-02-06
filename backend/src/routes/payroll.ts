import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { PayrollEngine } from '../services/payrollEngine';
import { generateTallyXml } from '../services/tallyExportService';
import ExcelJS from 'exceljs';

const router = Router();

// Get all payroll runs
router.get('/runs', authenticate, async (req, res) => {
    try {
        const runs = await prisma.payrollRun.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { payrolls: true }
                }
            }
        });
        res.json(runs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new payroll run
router.post('/runs', authenticate, async (req, res) => {
    const { month, year, batchName, periodStart, periodEnd } = req.body;
    try {
        const run = await prisma.payrollRun.create({
            data: {
                tenantId: (req as any).user.tenantId,
                month,
                year,
                batchName,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                status: 'draft'
            }
        });
        res.json(run);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Process all or selected employees in a run
router.post('/runs/:id/process', authenticate, async (req, res) => {
    const { id } = req.params;
    const { employeeIds } = req.body; // Optional: array of employee IDs to process
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        // Find all employees who either are active OR have logs in this period (to handle resignations)
        const whereClause: any = {
            OR: [
                { isActive: true },
                {
                    attendanceLogs: {
                        some: {
                            date: {
                                gte: new Date(run.year, run.month - 1, 1),
                                lte: new Date(run.year, run.month, 0)
                            }
                        }
                    }
                }
            ]
        };

        // If specific employees are requested, filter by them
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
            whereClause.id = { in: employeeIds };
        }

        const relevantEmployees = await prisma.employee.findMany({
            where: whereClause,
            select: { id: true }
        });

        const results = [];
        let totalGross = 0;
        let totalNet = 0;

        for (const emp of relevantEmployees) {
            const result = await PayrollEngine.calculateEmployeePayroll(emp.id, run.month, run.year, run.id);
            if (result.success) {
                results.push(result.data);
            }
        }

        // Recalculate totals for the whole run from the database
        const allPayrolls = await prisma.payroll.findMany({
            where: { payrollRunId: run.id }
        });

        totalGross = allPayrolls.reduce((sum, p) => sum + p.grossSalary, 0);
        totalNet = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

        // Update run stats
        await prisma.payrollRun.update({
            where: { id },
            data: {
                status: 'review',
                totalEmployees: allPayrolls.length,
                totalGross,
                totalNet,
                processedAt: new Date(),
                processedBy: (req as any).user.username
            }
        });

        res.json({ message: 'Payroll processed successfully', employeeCount: relevantEmployees.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Process a single employee within a run
router.post('/runs/:id/process-single', authenticate, async (req, res) => {
    const { id } = req.params;
    const { employeeId } = req.body;
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        const result = await PayrollEngine.calculateEmployeePayroll(employeeId, run.month, run.year, run.id);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Recalculate totals for the whole run
        const allPayrolls = await prisma.payroll.findMany({
            where: { payrollRunId: run.id }
        });

        const totalGross = allPayrolls.reduce((sum, p) => sum + p.grossSalary, 0);
        const totalNet = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

        await prisma.payrollRun.update({
            where: { id },
            data: {
                totalEmployees: allPayrolls.length,
                totalGross,
                totalNet
            }
        });

        res.json({ message: 'Employee payroll processed', payroll: result.data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a payroll run
router.delete('/runs/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        // Find the run first
        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        if (run.status === 'locked' || run.status === 'finalized') {
            return res.status(403).json({ error: 'Cannot delete a finalized/locked run' });
        }

        // First disconnect/delete individual payroll records
        await prisma.payroll.deleteMany({
            where: { payrollRunId: id }
        });

        // Then delete the run
        await prisma.payrollRun.delete({
            where: { id }
        });

        res.json({ message: 'Payroll run deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get details of a specific run
router.get('/runs/:id', authenticate, async (req, res) => {
    try {
        const run = await prisma.payrollRun.findUnique({
            where: { id: req.params.id },
            include: {
                payrolls: {
                    include: {
                        employee: {
                            include: {
                                designation: true,
                                department: true,
                                branch: true
                            }
                        }
                    }
                }
            }
        });
        res.json(run);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Finalize/Lock a run
router.post('/runs/:id/finalize', authenticate, async (req, res) => {
    try {
        const run = await prisma.payrollRun.update({
            where: { id: req.params.id },
            data: {
                status: 'finalized',
                approvedAt: new Date(),
                approvedBy: (req as any).user.username
            }
        });

        // Lock all individual payrolls
        await prisma.payroll.updateMany({
            where: { payrollRunId: run.id },
            data: { status: 'locked' }
        });

        res.json(run);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Bank Export CSV
router.get('/runs/:id/export-bank', authenticate, async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            where: { payrollRunId: req.params.id },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        accountNumber: true,
                        bankName: true,
                        ifscCode: true
                    }
                }
            }
        });

        let csv = 'Beneficiary Name,Account Number,IFSC Code,Amount,Narration\n';

        payrolls.forEach(p => {
            const name = `${p.employee.firstName} ${p.employee.lastName}`.replace(/,/g, '');
            const acc = p.employee.accountNumber || '';
            const ifsc = p.employee.ifscCode || '';
            const amount = p.netSalary.toFixed(2);
            const narration = `Salary ${p.month}/${p.year}`;

            csv += `"${name}","${acc}","${ifsc}",${amount},"${narration}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=bank_export_${req.params.id}.csv`);
        res.status(200).send(csv);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Tally XML Export
router.get('/runs/:id/export-tally', authenticate, async (req, res) => {
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        const xml = await generateTallyXml((req as any).user.tenantId, run.month, run.year);

        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename=tally_payroll_${run.month}_${run.year}.xml`);
        res.status(200).send(xml);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Detailed Ledger Review Excel Export (Pre-Finalize)
router.get('/runs/:id/export-review', authenticate, async (req, res) => {
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        const payrolls = await prisma.payroll.findMany({
            where: { payrollRunId: req.params.id },
            include: {
                employee: {
                    include: {
                        designation: true,
                        department: true,
                        branch: true
                    }
                }
            },
            orderBy: { employee: { employeeCode: 'asc' } }
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payroll Ledger');

        // Styles
        const headerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 10, name: 'Calibri' },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
        };

        const titleStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 14, name: 'Calibri' },
            alignment: { horizontal: 'center' }
        };

        // Row 1: Company Title (Placeholder)
        worksheet.mergeCells('A1:AC1');
        const titleRow = worksheet.getCell('A1');
        const monthName = new Date(run.year, run.month - 1).toLocaleString('default', { month: 'long' });
        titleRow.value = `Payroll Ledger for ${monthName} ${run.year}`;
        titleRow.style = titleStyle as any;

        // Row 2: Group Headers
        // Emp Detail (A-F) | Attendance (G-I) | Fixed Salary (J-K) | Earned Salary (L-Q) | Deductions (R-Y) | Net Salary (Z-AA) | Other (AB-AC)

        const setHeader = (cell: string, val: string) => {
            const c = worksheet.getCell(cell);
            c.value = val;
            c.style = headerStyle as any;
        };

        // Emulating the merged header structure
        // A2:F2 -> Employee Detail
        worksheet.mergeCells('A2:F2');
        setHeader('A2', 'Employee Detail');

        // G2:I2 -> Attendance
        worksheet.mergeCells('G2:I2');
        setHeader('G2', 'Attendance');

        // J2:L2 -> Fixed Salary
        worksheet.mergeCells('J2:L2');
        setHeader('J2', 'Fixed Salary');

        // M2:Q2 -> Earned Salary
        worksheet.mergeCells('M2:Q2');
        setHeader('M2', 'Earned Salary');

        // R2:Y2 -> Deductions
        worksheet.mergeCells('R2:Y2');
        setHeader('R2', 'Deductions');

        // Z2:AA2 -> Final Salary / Net
        worksheet.mergeCells('Z2:AA2');
        setHeader('Z2', 'Net Salary');

        // AB2:AC2 -> Actions/Notes
        worksheet.mergeCells('AB2:AC2');
        setHeader('AB2', 'Final Payable');

        // Row 3: Column Headers
        const columns = [
            'SNo', 'Emp Name', 'DESIGNATION', 'DEPT', 'D.O.J.', 'PAN', // Emp Detail
            'Total Days', 'Paid Days', 'LOP Days', // Attendance
            'CTC (Monthly)', 'Employer PF', 'Fixed Gross', // Fixed
            'Basic', 'HRA', 'Conveyance', 'Medical', 'Other Allow', // Earned
            'TDS', 'Emp PF', 'PT', 'ESI', 'Welfare', 'Insurance', 'Uniform', 'Total Ded', // Deductions
            'Net Salary', 'Retention', 'Final Pay' // Final
        ];

        const r3 = worksheet.getRow(3);
        r3.values = columns;
        r3.eachCell((cell) => {
            cell.style = headerStyle as any;
        });

        // Data Rows
        payrolls.forEach((p, index) => {
            const details: any = p.details ? JSON.parse(p.details as string) : {};
            const e = p.employee;

            // Format dates
            const doj = e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : '-';

            const row = [
                index + 1,
                `${e.firstName} ${e.lastName}`,
                e.designation?.name || '-',
                e.department?.name || '-',
                doj,
                e.panNumber || '-',

                // Attendance
                p.totalWorkingDays, // Should be Month Days now
                p.paidDays,
                p.lopDays,

                // Fixed Salary columns
                e.monthlyCtc || 0,
                p.employerPF || 0,
                p.grossSalary || 0,

                // Earned Salary Breakdown
                p.basicPaid,
                p.hraPaid,
                details['CONVEYANCE'] || 0,
                details['MEDICAL'] || 0,
                (details['OTHER_ALLOW'] || 0) + (details['EDU_ALL'] || 0), // Bundle Edu into Other or separate if needed

                // Deductions
                details['TDS'] || 0,
                p.pfDeduction,
                p.ptDeduction,
                p.esiDeduction,
                details['STAFF_WELFARE'] || 0,
                details['INSURANCE'] || 0,
                details['UNIFORM'] || 0,
                p.totalDeductions,

                // Net
                p.netSalary,
                p.retentionDeduction,
                p.finalTakeHome
            ];

            worksheet.addRow(row);
        });

        // Column Widths
        worksheet.columns.forEach(column => {
            column.width = 15;
        });
        if (worksheet.getColumn(2)) worksheet.getColumn(2).width = 25; // Name

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=payroll_review_${run.month}_${run.year}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error: any) {
        console.error('Export Review Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
