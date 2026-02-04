import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- VISITOR LOGS ---
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const visitors = await prisma.visitorLog.findMany({
            where: { tenantId },
            include: { host: { select: { firstName: true, lastName: true } } },
            orderBy: { checkIn: 'desc' }
        });
        res.json(visitors);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/check-in', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const visitor = await prisma.visitorLog.create({
            data: { ...req.body, tenantId, status: 'IN' }
        });
        res.json(visitor);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/check-out', authenticate, async (req, res) => {
    try {
        const visitor = await prisma.visitorLog.update({
            where: { id: req.params.id },
            data: {
                status: 'OUT',
                checkOut: new Date(),
                updatedAt: new Date()
            }
        });
        res.json(visitor);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
