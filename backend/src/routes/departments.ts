import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all departments
router.get('/', async (req, res) => {
  try {
    const { branchId, isActive } = req.query;

    const where: any = {};
    if (branchId) where.branchId = branchId as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const departments = await prisma.department.findMany({
      where,
      include: {
        branch: {
          include: {
            location: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        branch: true,
        employees: true,
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create department
router.post('/', async (req, res) => {
  try {
    const { name, code, branchId } = req.body;

    const department = await prisma.department.create({
      data: {
        name,
        code,
        branchId,
      },
      include: {
        branch: true,
      },
    });

    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, branchId, isActive } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        branchId,
        isActive,
      },
      include: {
        branch: true,
      },
    });

    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id },
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
