import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- ANNOUNCEMENTS ---
router.get('/announcements', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const announcements = await prisma.announcement.findMany({
            where: {
                tenantId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: new Date() } }
                ]
            },
            orderBy: { publishedAt: 'desc' }
        });
        res.json(announcements);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/announcements', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const announcement = await prisma.announcement.create({
            data: { ...req.body, tenantId }
        });
        res.json(announcement);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- NOTIFICATIONS ---
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;
        const notifications = await prisma.notification.findMany({
            where: {
                tenantId,
                OR: [
                    { userId: null }, // Global notifications
                    { userId: userId } // User-specific
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
