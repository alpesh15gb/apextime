import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- DASHBOARD FOR EMPLOYEE ---
router.get('/my-tasks', authenticate, async (req, res) => {
    try {
        const employeeId = (req as any).user.employeeId;
        if (!employeeId) throw new Error("Employee profile not linked");

        const tasks = await prisma.onboardingTask.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'asc' }
        });
        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN MANAGEMENT ---
router.get('/employee/:id', authenticate, async (req, res) => {
    try {
        const tasks = await prisma.onboardingTask.findMany({
            where: { employeeId: req.params.id },
            orderBy: { createdAt: 'asc' }
        });
        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/assign', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const task = await prisma.onboardingTask.create({
            data: { ...req.body, tenantId }
        });
        res.json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/complete', authenticate, async (req, res) => {
    try {
        const task = await prisma.onboardingTask.update({
            where: { id: req.params.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                updatedAt: new Date()
            }
        });
        res.json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
