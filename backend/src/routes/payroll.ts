import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { PayrollEngine } from '../services/payrollEngine';

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
<<<<<<< HEAD
                tenantId: (req as any).user.tenantId,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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

// Process all employees in a run
router.post('/runs/:id/process', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        // Find all employees who either are active OR have logs in this period (to handle resignations)
        const relevantEmployees = await prisma.employee.findMany({
            where: {
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
            },
            select: { id: true }
        });

        const results = [];
        let totalGross = 0;
        let totalNet = 0;

        for (const emp of relevantEmployees) {
            const result = await PayrollEngine.calculateEmployeePayroll(emp.id, run.month, run.year, run.id);
            if (result.success) {
                results.push(result.data);
                totalGross += result.metrics?.totalEarnings || 0;
                totalNet += result.metrics?.netSalary || 0;
            }
        }

        // Update run stats
        await prisma.payrollRun.update({
            where: { id },
            data: {
                status: 'review',
                totalEmployees: relevantEmployees.length,
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

export default router;
