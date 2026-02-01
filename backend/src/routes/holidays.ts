import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all holidays
router.get('/', async (req, res) => {
  try {
    const { year } = req.query;

    let where: any = {};

    if (year) {
      const startOfYear = new Date(parseInt(year as string), 0, 1);
      const endOfYear = new Date(parseInt(year as string), 11, 31, 23, 59, 59);
      where.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.json(holidays);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get holidays for a specific month/year
router.get('/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year required' });
    }

    const targetMonth = parseInt(month as string);
    const targetYear = parseInt(year as string);

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Also get recurring holidays
    const recurringHolidays = await prisma.holiday.findMany({
      where: {
        isRecurring: true,
      },
    });

    // Filter recurring holidays for this month/year
    const filteredRecurring = recurringHolidays.filter(h => {
      const hDate = new Date(h.date);
      return hDate.getMonth() + 1 === targetMonth;
    }).map(h => ({
      ...h,
      date: new Date(targetYear, targetMonth - 1, new Date(h.date).getDate()),
    }));

    res.json([...holidays, ...filteredRecurring]);
  } catch (error) {
    console.error('Get monthly holidays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create holiday
router.post('/', async (req, res) => {
  try {
    const { name, date, description, isRecurring } = req.body;

    const holiday = await prisma.holiday.create({
      data: {
        tenantId: (req as any).user.tenantId,
        name,
        date: new Date(date),
        description,
        isRecurring: isRecurring || false,
      },
    });

    res.json(holiday);
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update holiday
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, description, isRecurring } = req.body;

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name,
        date: date ? new Date(date) : undefined,
        description,
        isRecurring,
      },
    });

    res.json(holiday);
  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete holiday
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.holiday.delete({
      where: { id },
    });

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
