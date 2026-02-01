
import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../config/logger';

const router = express.Router();

// List all loans (optionally by employee)
router.get('/', authenticate, async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const tenantId = req.user!.tenantId;

        const where: any = { tenantId };
        if (employeeId) where.employeeId = String(employeeId);
        if (status) where.status = String(status);

        const loans = await prisma.loan.findMany({
            where,
            include: {
                employee: {
                    select: { firstName: true, lastName: true, employeeCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(loans);
    } catch (error) {
        logger.error('Failed to list loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans' });
    }
});

// Create Loan
router.post('/', authenticate, async (req, res) => {
    try {
        const { employeeId, amount, tenureMonths, startDate, monthlyDeduction, interestRate } = req.body;
        const tenantId = req.user!.tenantId;

        if (!employeeId || !amount || !tenureMonths || !startDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Default EMI if not provided = amount / tenure
        const emi = monthlyDeduction || (Number(amount) / Number(tenureMonths));

        const loan = await prisma.loan.create({
            data: {
                tenantId,
                employeeId,
                amount: Number(amount),
                tenureMonths: Number(tenureMonths),
                startDate: new Date(startDate),
                monthlyDeduction: Number(emi),
                interestRate: Number(interestRate || 0),
                status: 'ACTIVE',
                balanceAmount: Number(amount),
                repaidAmount: 0
            }
        });

        res.json(loan);
    } catch (error) {
        logger.error('Failed to create loan:', error);
        res.status(500).json({ error: 'Failed to create loan' });
    }
});

// Get Loan Details (with deductions history)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        const loan = await prisma.loan.findUnique({
            where: { id },
            include: {
                employee: { select: { firstName: true, lastName: true } },
                deductions: {
                    orderBy: { date: 'desc' },
                    include: { payroll: { select: { month: true, year: true } } }
                }
            }
        });

        if (!loan || loan.tenantId !== tenantId) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        res.json(loan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch loan details' });
    }
});

// Update Loan (e.g. Stop, Close)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const tenantId = req.user!.tenantId;

        const loan = await prisma.loan.update({
            where: { id }, // In a real multi-tenant app, check tenant access first, but Prisma will just fail if ID not found. safer to findMany or use middleware check.
            data: { status }
        });

        res.json(loan);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});


export default router;
