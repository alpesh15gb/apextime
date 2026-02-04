import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- COURSES ---
router.get('/courses', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const courses = await prisma.course.findMany({
            where: { tenantId },
            include: { sessions: true },
            orderBy: { title: 'asc' }
        });
        res.json(courses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/courses', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const course = await prisma.course.create({
            data: { ...req.body, tenantId }
        });
        res.json(course);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- SESSIONS ---
router.get('/sessions', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const sessions = await prisma.trainingSession.findMany({
            where: { tenantId },
            include: { course: { select: { title: true } } },
            orderBy: { scheduledAt: 'asc' }
        });
        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sessions', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const session = await prisma.trainingSession.create({
            data: {
                ...req.body,
                tenantId,
                scheduledAt: new Date(req.body.scheduledAt)
            }
        });
        res.json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
