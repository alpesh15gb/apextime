import express from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Only superadmins can manage tenants
router.use(authenticate, authorize('superadmin'));

// Get all tenants
router.get('/', async (req, res) => {
    try {
        const tenants = await prisma.tenant.findMany({
            include: {
                _count: {
                    select: {
                        employees: true,
                        users: true
                    }
                }
            }
        });
        res.json(tenants);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// Create tenant
router.post('/', async (req, res) => {
    try {
        const { name, slug, domain, settings } = req.body;

        const tenant = await prisma.tenant.create({
            data: {
                name,
                slug,
                code: slug.toUpperCase(),
                domain,
                settings,
                isActive: true
            }
        });

        res.status(201).json(tenant);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Slug or Domain already exists' });
        }
        res.status(500).json({ error: 'Failed to create tenant' });
    }
});

// Update tenant
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, domain, settings, isActive } = req.body;

        const tenant = await prisma.tenant.update({
            where: { id },
            data: { name, slug, domain, settings, isActive }
        });

        res.json(tenant);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

export default router;
