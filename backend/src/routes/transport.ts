import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// Get all routes
router.get('/', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const routes = await prisma.transportRoute.findMany({
            where: { tenantId },
            include: { _count: { select: { students: true } } }
        });
        res.json(routes);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create route
router.post('/', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const route = await prisma.transportRoute.create({
            data: { ...req.body, tenantId }
        });
        res.json(route);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update route
router.put('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const route = await prisma.transportRoute.update({
            where: { id },
            data: req.body
        });
        res.json(route);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete route
router.delete('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        await prisma.transportRoute.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
