import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

/**
 * Convert "HH:MM" time string to a Date object for Prisma @db.Time
 * PostgreSQL TIME type needs a valid date - we use 1970-01-01 as base
 */
function timeStringToDate(timeStr: string): Date {
  if (!timeStr) return new Date('1970-01-01T00:00:00.000Z');
  // Handle if already a valid ISO date string
  if (timeStr.includes('T') || timeStr.includes('-')) {
    return new Date(timeStr);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(`1970-01-01T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
}

/**
 * Convert a Date (from DB) to "HH:MM" string for frontend display
 */
function dateToTimeString(date: any): string {
  if (!date) return '00:00';
  const d = new Date(date);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Get all shifts
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;
    const where: any = { tenantId: (req as any).user.tenantId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Convert DateTime back to "HH:MM" strings for frontend
    const formatted = shifts.map(s => ({
      ...s,
      startTime: dateToTimeString(s.startTime),
      endTime: dateToTimeString(s.endTime),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shift by ID
router.get('/:id', async (req, res) => {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: { employees: true },
    });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    res.json({
      ...shift,
      startTime: dateToTimeString(shift.startTime),
      endTime: dateToTimeString(shift.endTime),
    });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create shift
router.post('/', async (req, res) => {
  try {
    const { name, startTime, endTime, gracePeriodIn, gracePeriodOut, isNightShift } = req.body;

    const shift = await prisma.shift.create({
      data: {
        tenantId: (req as any).user.tenantId,
        name,
        startTime: timeStringToDate(startTime),
        endTime: timeStringToDate(endTime),
        gracePeriodIn: gracePeriodIn || 0,
        gracePeriodOut: gracePeriodOut || 0,
        isNightShift: isNightShift || false,
      },
    });

    res.status(201).json({
      ...shift,
      startTime: dateToTimeString(shift.startTime),
      endTime: dateToTimeString(shift.endTime),
    });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shift
router.put('/:id', async (req, res) => {
  try {
    const { name, startTime, endTime, gracePeriodIn, gracePeriodOut, isNightShift, isActive } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (startTime !== undefined) data.startTime = timeStringToDate(startTime);
    if (endTime !== undefined) data.endTime = timeStringToDate(endTime);
    if (gracePeriodIn !== undefined) data.gracePeriodIn = gracePeriodIn;
    if (gracePeriodOut !== undefined) data.gracePeriodOut = gracePeriodOut;
    if (isNightShift !== undefined) data.isNightShift = isNightShift;
    if (isActive !== undefined) data.isActive = isActive;

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      ...shift,
      startTime: dateToTimeString(shift.startTime),
      endTime: dateToTimeString(shift.endTime),
    });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shift
router.delete('/:id', async (req, res) => {
  try {
    await prisma.shift.delete({ where: { id: req.params.id } });
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
