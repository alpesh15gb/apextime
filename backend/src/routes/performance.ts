import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- GOALS / OKRs ---
router.get('/goals', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;
        const goals = await prisma.goal.findMany({
            where: { tenantId, employeeId: employeeId || undefined },
            include: { employee: { select: { firstName: true, lastName: true } } },
            orderBy: { dueDate: 'asc' }
        });
        res.json(goals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/goals', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const goal = await prisma.goal.create({
            data: { ...req.body, tenantId }
        });
        res.json(goal);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- FEEDBACK ---
router.get('/feedback', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;
        const feedback = await prisma.feedback.findMany({
            where: {
                tenantId,
                OR: [
                    { toEmployeeId: employeeId },
                    { fromEmployeeId: employeeId }
                ]
            },
            include: {
                fromEmployee: { select: { firstName: true, lastName: true } },
                toEmployee: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(feedback);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/feedback', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const fromEmployeeId = (req as any).user.employeeId;
        const feedback = await prisma.feedback.create({
            data: { ...req.body, tenantId, fromEmployeeId }
        });
        res.json(feedback);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- APPRAISALS ---
router.get('/appraisals', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;
        const appraisals = await prisma.appraisal.findMany({
            where: { tenantId, employeeId: employeeId || undefined },
            include: { employee: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(appraisals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
