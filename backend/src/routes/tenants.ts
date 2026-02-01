import express from 'express';
import { prisma, basePrisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import bcrypt from 'bcryptjs';

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
        const { name, slug, domain, settings, modules } = req.body;

        // Use basePrisma to bypass RLS (since we are SuperAdmin (global) creating for another tenant)
        const tenant = await basePrisma.tenant.create({
            data: {
                name,
                slug,
                code: slug.toUpperCase(),
                domain,
                settings,
                modules,
                isActive: true
            }
        });
        // ... (rest of create user logic)

        // Update tenant
        router.put('/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { name, slug, domain, settings, isActive, modules } = req.body;

                const tenant = await prisma.tenant.update({
                    where: { id },
                    data: { name, slug, domain, settings, isActive, modules }
                });

                res.json(tenant);
                // ...

                // Create default admin user
                const hashedPassword = await bcrypt.hash('admin', 10);
                await basePrisma.user.create({
                    data: {
                        tenantId: tenant.id,
                        username: 'admin',
                        password: hashedPassword,
                        role: 'admin',
                    }
                });

                // Create default shift
                await basePrisma.shift.create({
                    data: {
                        tenantId: tenant.id,
                        name: 'General Shift',
                        code: 'GS',
                        startTime: new Date('1970-01-01T09:00:00Z'),
                        endTime: new Date('1970-01-01T18:00:00Z'),
                        gracePeriodIn: 15,
                        gracePeriodOut: 15,
                        isNightShift: false,
                    }
                });

                res.status(201).json(tenant);
            } catch (error: any) {
                console.error('Create tenant error:', error);
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

        // Reset tenant admin password
        router.post('/:id/reset-admin', async (req, res) => {
            try {
                const { id } = req.params;
                const { password } = req.body;

                const hashedPassword = await bcrypt.hash(password || 'admin', 10);

                // Use basePrisma to bypass RLS
                await basePrisma.user.upsert({
                    where: {
                        username_tenantId: {
                            username: 'admin',
                            tenantId: id
                        }
                    },
                    update: {
                        password: hashedPassword
                    },
                    create: {
                        tenantId: id,
                        username: 'admin',
                        password: hashedPassword,
                        role: 'admin'
                    }
                });

                res.json({ message: 'Admin password reset successfully' });
            } catch (error) {
                console.error('Reset admin password error:', error);
                res.status(500).json({ error: 'Failed to reset password' });
            }
        });

        export default router;
