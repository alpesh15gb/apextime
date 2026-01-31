import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all shifts
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(shifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shift by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        employees: true,
      },
    });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(shift);
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create shift
router.post('/', async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      gracePeriodIn,
      gracePeriodOut,
      isNightShift,
    } = req.body;

    const shift = await prisma.shift.create({
      data: {
<<<<<<< HEAD
        tenantId: (req as any).user.tenantId,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
        name,
        startTime,
        endTime,
        gracePeriodIn: gracePeriodIn || 0,
        gracePeriodOut: gracePeriodOut || 0,
        isNightShift: isNightShift || false,
      },
    });

    res.status(201).json(shift);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shift
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      startTime,
      endTime,
      gracePeriodIn,
      gracePeriodOut,
      isNightShift,
      isActive,
    } = req.body;

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        name,
        startTime,
        endTime,
        gracePeriodIn,
        gracePeriodOut,
        isNightShift,
        isActive,
      },
    });

    res.json(shift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shift
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.shift.delete({
      where: { id },
    });

    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
