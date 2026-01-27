import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all devices
router.get('/', async (req, res) => {
  try {
    const { isActive, status } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (status) where.status = status as string;

    const devices = await prisma.device.findMany({
      where,
      include: {
        deviceUsers: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get device by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        deviceUsers: true,
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create device
router.post('/', async (req, res) => {
  try {
    const { deviceId, name, ipAddress, port, location } = req.body;

    const device = await prisma.device.create({
      data: {
        deviceId,
        name,
        ipAddress,
        port,
        location,
      },
    });

    res.status(201).json(device);
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update device
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, name, ipAddress, port, location, isActive, status } = req.body;

    const device = await prisma.device.update({
      where: { id },
      data: {
        deviceId,
        name,
        ipAddress,
        port,
        location,
        isActive,
        status,
      },
    });

    res.json(device);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete device
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.device.delete({
      where: { id },
    });

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync device users from SQL Server
router.post('/sync-users', async (req, res) => {
  try {
    const { getSqlPool } = await import('../config/database');
    const pool = await getSqlPool();

    // Query DeviceUsers from SQL Server
    const result = await pool.request().query(`
      SELECT DeviceId, UserId, Name
      FROM DeviceUsers
      WHERE IsActive = 1
    `);

    const deviceUsers = result.recordset;

    // Sync to PostgreSQL
    for (const user of deviceUsers) {
      await prisma.deviceUser.upsert({
        where: {
          deviceId_deviceUserId: {
            deviceId: user.DeviceId.toString(),
            deviceUserId: user.UserId.toString(),
          },
        },
        update: {
          name: user.Name,
        },
        create: {
          deviceId: user.DeviceId.toString(),
          deviceUserId: user.UserId.toString(),
          name: user.Name,
        },
      });
    }

    res.json({
      message: 'Device users synced successfully',
      count: deviceUsers.length
    });
  } catch (error) {
    console.error('Sync device users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
