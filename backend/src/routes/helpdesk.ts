import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- TICKETS ---
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;
        const isAdmin = ['admin', 'hr'].includes((req as any).user.role);

        const tickets = await prisma.ticket.findMany({
            where: {
                tenantId,
                employeeId: isAdmin ? undefined : (employeeId || 'none')
            },
            include: {
                employee: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId;
        if (!employeeId) throw new Error("Employee profile not found");

        const ticket = await prisma.ticket.create({
            data: { ...req.body, tenantId, employeeId }
        });
        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status, resolution, assignedTo } = req.body;
        const ticket = await prisma.ticket.update({
            where: { id: req.params.id },
            data: { status, resolution, assignedTo, updatedAt: new Date() }
        });
        res.json(ticket);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
