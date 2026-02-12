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
        // Emp Detail (A-F) | Attendance (G-I) | Fixed Salary (J-O) | Earned Salary (P-V) | Deductions (W-AD) | Net Salary (AE-AH)

        const setHeader = (cell: string, val: string) => {
            const c = worksheet.getCell(cell);
            c.value = val;
            c.style = headerStyle as any;
        };

        // A2:F2 -> Employee Detail
        worksheet.mergeCells('A2:F2');
        setHeader('A2', 'Employee Detail');

        // G2:I2 -> Attendance
        worksheet.mergeCells('G2:I2');
        setHeader('G2', 'Attendance');

        // J2:O2 -> Fixed Salary (6 Cols)
        worksheet.mergeCells('J2:O2');
        setHeader('J2', 'Fixed Salary');

        // P2:V2 -> Earned Salary (7 Cols)
        worksheet.mergeCells('P2:V2');
        setHeader('P2', 'Earned Salary');

        // W2:AD2 -> Deductions (8 Cols)
        worksheet.mergeCells('W2:AD2');
        setHeader('W2', 'Deductions');

        // AE2:AH2 -> Net Salary (4 Cols)
        worksheet.mergeCells('AE2:AH2');
        setHeader('AE2', 'Net Salary');

        // Row 3: Column Headers
        const columns = [
            'SNo', 'Emp Name', 'DESIGNATION', 'DEPT', 'D.O.J.', 'PAN', // Emp Detail
            'Total Days', 'Paid Days', 'LOP Days', // Attendance

            // Fixed Salary
            'Fixed Basic', 'Fixed HRA', 'Fixed Conv', 'Fixed Edu', 'Fixed Medical', 'Fixed LTA', 'Fixed Special',

            // Earned Salary
            'Basic', 'HRA', 'Conveyance', 'Education', 'Medical', 'LTA', 'Special Allow', 'Total Earned',

            // Deductions
            'TDS', 'PF', 'PT', 'ESI', 'Staff Welfare', 'Insurance', 'Uniform', 'Total Ded',

            // Net
            'Net Salary', 'Advances', 'LOP Amount', 'Net Payable'
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

            // Calculate Fixed Components
            const CTC = e.monthlyCtc || 0;
            let fixedBasic = 0, fixedHRA = 0, fixedConv = 0, fixedEdu = 0, fixedMed = 0, fixedLTA = 0, fixedOther = 0;

            if (CTC > 0) {
                fixedBasic = CTC * 0.40;
                fixedHRA = CTC * 0.20;
                fixedConv = CTC * 0.05;
                fixedEdu = CTC * 0.05;
                fixedMed = CTC * 0.10;
                fixedLTA = CTC * 0.10;
                fixedOther = CTC * 0.10;
            }

            const row = [
                index + 1,
                `${e.firstName} ${e.lastName}`,
                e.designation?.name || '-',
                e.department?.name || '-',
                doj,
                e.panNumber || '-',

                // Attendance
                p.totalWorkingDays,
                p.paidDays,
                p.lopDays,

                // Fixed Salary columns
                fixedBasic,
                fixedHRA,
                fixedConv,
                fixedEdu,
                fixedMed,
                fixedLTA,
                fixedOther,

                // Earned Salary Breakdown
                p.basicPaid,
                p.hraPaid,
                (details['CONVEYANCE_ALLOWANCE'] || details['CONVEYANCE'] || 0),
                (details['EDUCATION_ALLOWANCE'] || details['EDU_ALL'] || 0),
                (details['MEDICAL_ALLOWANCE'] || details['MEDICAL'] || 0),
                (details['LTA'] || 0),
                (details['SPECIAL_ALLOWANCE'] || details['OTHER_ALLOWANCE'] || details['OTHER_ALLOW'] || 0),
                p.grossSalary, // Total Earned

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
                Math.round(CTC - p.grossSalary), // LOP Amount calculated as CTC minus earned Gross
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

// ============================================
// LOCATION-WISE PAYROLL PROCESSING
// ============================================

// Create location-wise payroll run
router.post('/runs/location', authenticate, async (req, res) => {
    const { month, year, batchName, periodStart, periodEnd, branchId, locationId } = req.body;
    try {
        const tenantId = (req as any).user.tenantId;

        // Get location/branch name for batch naming
        let locationName = '';
        if (branchId) {
            const branch = await prisma.branch.findUnique({ where: { id: branchId } });
            locationName = branch?.name || '';
        } else if (locationId) {
            const location = await prisma.location.findUnique({ where: { id: locationId } });
            locationName = location?.name || '';
        }

        const run = await prisma.payrollRun.create({
            data: {
                tenantId,
                month,
                year,
                batchName: batchName || `${locationName} Payroll ${month}/${year}`,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                status: 'draft'
            }
        });

        res.json({ ...run, branchId, locationId, locationName });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Process payroll for specific branch/location
router.post('/runs/:id/process-location', authenticate, async (req, res) => {
    const { id } = req.params;
    const { branchId, locationId } = req.body;

    try {
        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        // Build employee filter based on location
        const whereClause: any = {
            tenantId: (req as any).user.tenantId,
            isActive: true
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }
        if (locationId) {
            whereClause.locationId = locationId;
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            select: { id: true, firstName: true, lastName: true, branchId: true }
        });

        if (employees.length === 0) {
            return res.status(400).json({ error: 'No employees found for the selected location' });
        }

        const results = [];
        for (const emp of employees) {
            const result = await PayrollEngine.calculateEmployeePayroll(emp.id, run.month, run.year, run.id);
            if (result.success) {
                results.push(result.data);
            }
        }

        // Update run stats
        const allPayrolls = await prisma.payroll.findMany({
            where: { payrollRunId: run.id }
        });

        const totalGross = allPayrolls.reduce((sum, p) => sum + p.grossSalary, 0);
        const totalNet = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

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

        res.json({
            message: 'Location-wise payroll processed successfully',
            employeeCount: employees.length,
            branchId,
            locationId
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get payroll summary by location
router.get('/summary/by-location', authenticate, async (req, res) => {
    const { month, year } = req.query;

    try {
        const tenantId = (req as any).user.tenantId;

        // Get all branches with payroll stats
        const branches = await prisma.branch.findMany({
            where: { tenantId },
            include: {
                employees: {
                    select: { id: true }
                }
            }
        });

        const summary = [];

        for (const branch of branches) {
            const employeeIds = branch.employees.map(e => e.id);

            if (employeeIds.length === 0) {
                summary.push({
                    branchId: branch.id,
                    branchName: branch.name,
                    branchCode: branch.code,
                    employeeCount: 0,
                    totalGross: 0,
                    totalNet: 0,
                    totalTDS: 0,
                    totalPF: 0,
                    totalESI: 0
                });
                continue;
            }

            const payrollStats = await prisma.payroll.aggregate({
                where: {
                    employeeId: { in: employeeIds },
                    month: month ? parseInt(month as string) : undefined,
                    year: year ? parseInt(year as string) : undefined
                },
                _sum: {
                    grossSalary: true,
                    netSalary: true,
                    tdsDeduction: true,
                    pfDeduction: true,
                    esiDeduction: true
                },
                _count: true
            });

            summary.push({
                branchId: branch.id,
                branchName: branch.name,
                branchCode: branch.code,
                employeeCount: employeeIds.length,
                processedCount: payrollStats._count,
                totalGross: payrollStats._sum.grossSalary || 0,
                totalNet: payrollStats._sum.netSalary || 0,
                totalTDS: payrollStats._sum.tdsDeduction || 0,
                totalPF: payrollStats._sum.pfDeduction || 0,
                totalESI: payrollStats._sum.esiDeduction || 0
            });
        }

        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

import { SandboxService } from '../services/sandboxService';

import { Form16Service } from '../services/form16Service';

// ============================================
// OFFICIAL FORM 16 (TRACES / SANDBOX)
// ============================================

// Generate Form 16 Part B
router.get('/form16/generate-unique/:employeeId', authenticate, async (req, res) => {
    const { employeeId } = req.params;
    const { financialYear } = req.query;
    try {
        await Form16Service.generatePartB(employeeId, (financialYear as string) || '2025-26', res);
    } catch (error: any) {
        console.error('Form 16 Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk Download Placeholder (Simplification: return a ZIP logic usually goes here)
router.get('/form16/bulk-download', authenticate, async (req, res) => {
    const { financialYear } = req.query;
    // For now, we'll just return success to indicate endpoint existence
    res.json({ message: 'Bulk generation triggered. Check your document library soon.' });
});

// Verify Employee PAN
router.post('/form16/verify-pan', authenticate, async (req, res) => {
    const { pan, credentials } = req.body;
    try {
        let result;
        // If TRACES credentials are provided, use the official bridge for deep verification
        if (credentials && credentials.username && credentials.password) {
            result = await SandboxService.verifyPANWithTraces(pan, credentials);
        } else {
            // Fallback to basic KYC (which requires DOB/Name in the body, so this might fail if basic)
            result = await SandboxService.verifyPAN(pan);
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger TRACES Sync
router.post('/form16/sync-traces', authenticate, async (req, res) => {
    const { username, password, tan, financialYear, quarter } = req.body;
    try {
        const result = await SandboxService.requestForm16PartA(
            { username, password, tan },
            financialYear,
            quarter || 'Q4'
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Check TRACES Job Status
router.get('/form16/job-status/:jobId', authenticate, async (req, res) => {
    const { jobId } = req.params;
    try {
        const result = await SandboxService.checkJobStatus(jobId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to get current financial year
function getCurrentFinancialYear(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Financial year in India is April to March
    if (month >= 4) {
        return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
        return `${year - 1}-${year.toString().slice(-2)}`;
    }
}

// Get TDS Challans
router.get('/form16/challans', authenticate, async (req, res) => {
    const { financialYear } = req.query;
    try {
        const tenantId = (req as any).user.tenantId;
        const challans = await prisma.tDSChallan.findMany({
            where: {
                tenantId,
                financialYear: financialYear as string
            },
            orderBy: { quarter: 'asc' }
        });
        res.json(challans);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Upsert TDS Challan
router.post('/form16/challans', authenticate, async (req, res) => {
    const { financialYear, quarter, receiptNo, bsrCode, depositedOn, challanSerialNo, totalTaxAmount } = req.body;
    try {
        const tenantId = (req as any).user.tenantId;
        const challan = await prisma.tDSChallan.upsert({
            where: {
                tenantId_financialYear_quarter: {
                    tenantId,
                    financialYear,
                    quarter
                }
            },
            update: {
                receiptNo,
                bsrCode,
                depositedOn: depositedOn ? new Date(depositedOn) : null,
                challanSerialNo,
                totalTaxAmount
            },
            create: {
                tenantId,
                financialYear,
                quarter,
                receiptNo,
                bsrCode,
                depositedOn: depositedOn ? new Date(depositedOn) : null,
                challanSerialNo,
                totalTaxAmount
            }
        });
        res.json(challan);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get payrolls for the authenticated employee (for Employee Portal)
router.get('/my-payrolls', authenticate, async (req, res) => {
    try {
        const employeeId = (req as any).user.employeeId;
        if (!employeeId) {
            return res.status(400).json({ error: 'User is not linked to an employee record' });
        }

        const payrolls = await prisma.payroll.findMany({
            where: {
                employeeId,
                status: { in: ['locked', 'finalized', 'paid'] } // Only show finalized ones
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            include: {
                employee: {
                    include: {
                        designation: true,
                        department: true
                    }
                }
            }
        });

        res.json(payrolls);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
