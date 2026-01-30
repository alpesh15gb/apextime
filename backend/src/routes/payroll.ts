import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { PayrollEngine } from '../services/payrollEngine';

const router = Router();
const prisma = new PrismaClient();

// Get all payroll runs
router.get('/runs', authenticateToken, async (req, res) => {
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
router.post('/runs', authenticateToken, async (req, res) => {
    const { month, year, batchName, periodStart, periodEnd } = req.body;
    try {
        const run = await prisma.payrollRun.create({
            data: {
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
router.post('/runs/:id/process', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        const activeEmployees = await prisma.employee.findMany({
            where: { isActive: true },
            select: { id: true }
        });

        const results = [];
        let totalGross = 0;
        let totalNet = 0;

        for (const emp of activeEmployees) {
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
                totalEmployees: activeEmployees.length,
                totalGross,
                totalNet,
                processedAt: new Date(),
                processedBy: (req as any).user.username
            }
        });

        res.json({ message: 'Payroll processed successfully', employeeCount: activeEmployees.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get details of a specific run
router.get('/runs/:id', authenticateToken, async (req, res) => {
    try {
        const run = await prisma.payrollRun.findUnique({
            where: { id: req.params.id },
            include: {
                payrolls: {
                    include: {
                        employee: {
                            select: { firstName: true, lastName: true, employeeCode: true }
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
router.post('/runs/:id/finalize', authenticateToken, async (req, res) => {
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

export default router;
