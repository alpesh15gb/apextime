import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

// --- JOB OPENINGS ---
router.get('/jobs', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const jobs = await prisma.jobOpening.findMany({
            where: { tenantId },
            include: { _count: { select: { candidates: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(jobs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/jobs', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const job = await prisma.jobOpening.create({
            data: { ...req.body, tenantId }
        });
        res.json(job);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- CANDIDATES ---
router.get('/candidates', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const candidates = await prisma.candidate.findMany({
            where: { tenantId },
            include: { job: { select: { title: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(candidates);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/candidates', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const candidate = await prisma.candidate.create({
            data: { ...req.body, tenantId }
        });
        res.json(candidate);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/candidates/:id/status', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const { status, notes } = req.body;
        const candidate = await prisma.candidate.update({
            where: { id: req.params.id },
            data: { status, notes }
        });
        res.json(candidate);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
