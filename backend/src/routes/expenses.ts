import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- REIMBURSEMENTS / EXPENSES ---
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;

        // Employees see only their own, Admins/HR see all
        const isAdmin = ['admin', 'hr'].includes((req as any).user.role);

        const expenses = await prisma.reimbursementEntry.findMany({
            where: {
                tenantId,
                employeeId: isAdmin ? undefined : (employeeId || 'none')
            },
            include: {
                employee: { select: { firstName: true, lastName: true } }
            },
            orderBy: { billDate: 'desc' }
        });
        res.json(expenses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;

        if (!employeeId) throw new Error("Employee profile not found");

        const expense = await prisma.reimbursementEntry.create({
            data: {
                ...req.body,
                tenantId,
                employeeId,
                billDate: new Date(req.body.billDate)
            }
        });
        res.json(expense);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const { status, remarks } = req.body;

        const updated = await prisma.reimbursementEntry.update({
            where: { id: req.params.id },
            data: {
                status,
                rejectedReason: status === 'REJECTED' ? remarks : undefined,
                approvedAt: status === 'APPROVED' ? new Date() : undefined,
                approvedBy: (req as any).user.id
            }
        });
        res.json(updated);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
