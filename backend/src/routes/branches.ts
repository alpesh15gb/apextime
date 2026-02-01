import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all branches
router.get('/', async (req, res) => {
  try {
    const { locationId, isActive } = req.query;

    const where: any = {};
    if (locationId) where.locationId = locationId as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const branches = await prisma.branch.findMany({
      where,
      include: {
        location: true,
        departments: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get branch by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        location: true,
        departments: true,
        employees: true,
      },
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create branch
router.post('/', async (req, res) => {
  try {
    const { name, code, locationId } = req.body;

    const branch = await prisma.branch.create({
      data: {
        tenantId: (req as any).user.tenantId,
        name,
        code,
        locationId,
      },
      include: {
        location: true,
      },
    });

    res.status(201).json(branch);
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update branch
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, locationId, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        code,
        locationId,
        isActive,
      },
      include: {
        location: true,
      },
    });

    res.json(branch);
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete branch
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.branch.delete({
      where: { id },
    });

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
