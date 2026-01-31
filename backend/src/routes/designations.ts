import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all designations
router.get('/', async (req, res) => {
    try {
        const { isActive } = req.query;

        const where: any = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const designations = await prisma.designation.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        res.json(designations);
    } catch (error) {
        console.error('Get designations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create designation
router.post('/', async (req, res) => {
    try {
        const { name, code, description } = req.body;

        const designation = await prisma.designation.create({
            data: {
<<<<<<< HEAD
                tenantId: (req as any).user.tenantId,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
                name,
                code,
                description,
            },
        });

        res.status(201).json(designation);
    } catch (error) {
        console.error('Create designation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update designation
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, isActive } = req.body;

        const designation = await prisma.designation.update({
            where: { id },
            data: {
                name,
                code,
                description,
                isActive,
            },
        });

        res.json(designation);
    } catch (error) {
        console.error('Update designation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete designation
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.designation.delete({
            where: { id },
        });

        res.json({ message: 'Designation deleted successfully' });
    } catch (error) {
        console.error('Delete designation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
