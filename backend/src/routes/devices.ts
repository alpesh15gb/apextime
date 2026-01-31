import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all devices
router.get('/', async (req, res) => {
  try {
    const { isActive, status } = req.query;

<<<<<<< HEAD
    const tenantId = (req as any).user.tenantId;

    const where: any = { tenantId };
=======
    const where: any = {};
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
<<<<<<< HEAD
    const tenantId = (req as any).user.tenantId;

    const device = await prisma.device.findFirst({
      where: { id, tenantId },
=======

    const device = await prisma.device.findUnique({
      where: { id },
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
<<<<<<< HEAD
    const { deviceId, name, ipAddress, port, location, protocol, serialNumber } = req.body;
    const tenantId = (req as any).user.tenantId;

    const device = await prisma.device.create({
      data: {
        tenantId,
=======
    const { deviceId, name, ipAddress, port, location } = req.body;

    const device = await prisma.device.create({
      data: {
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
        deviceId,
        name,
        ipAddress,
        port,
        location,
<<<<<<< HEAD
        protocol: protocol || 'SDK',
        serialNumber,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
<<<<<<< HEAD
    const tenantId = (req as any).user.tenantId;
    const { deviceId, name, ipAddress, port, location, isActive, status, protocol, serialNumber } = req.body;

    const device = await prisma.device.updateMany({
      where: { id, tenantId },
=======
    const { deviceId, name, ipAddress, port, location, isActive, status } = req.body;

    const device = await prisma.device.update({
      where: { id },
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
      data: {
        deviceId,
        name,
        ipAddress,
        port,
        location,
        isActive,
        status,
<<<<<<< HEAD
        protocol,
        serialNumber,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
<<<<<<< HEAD
    const tenantId = (req as any).user.tenantId;

    await prisma.device.deleteMany({
      where: { id, tenantId },
=======

    await prisma.device.delete({
      where: { id },
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
<<<<<<< HEAD
      const tenantId = (req as any).user.tenantId;
      await prisma.deviceUser.upsert({
        where: {
          deviceId_deviceUserId_tenantId: {
            deviceId: user.DeviceId.toString(),
            deviceUserId: user.UserId.toString(),
            tenantId,
=======
      await prisma.deviceUser.upsert({
        where: {
          deviceId_deviceUserId: {
            deviceId: user.DeviceId.toString(),
            deviceUserId: user.UserId.toString(),
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
          },
        },
        update: {
          name: user.Name,
        },
        create: {
<<<<<<< HEAD
          tenantId,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
<<<<<<< HEAD
    // Queue a log recovery command for a device
    router.post('/:id/log-recovery', async (req, res) => {
      try {
        const { id } = req.params;
        const { startDate } = req.body; // YYYY-MM-DD
        const tenantId = (req as any).user.tenantId;

        const device = await prisma.device.findUnique({
          where: { id, tenantId }
        });

        if (!device) return res.status(404).json({ error: 'Device not found' });

        // Format date for ZKTeco: YYYYMMDDHHMMSS
        const formattedDate = startDate ? startDate.replace(/-/g, '') + '000000' : '20240101000000';

        // Command format for ADMS: C:415:DATA QUERY tablename=ATTLOG,fielddesc=*,filter=Time>=XXXX
        const recoveryCommand = `C:415:DATA QUERY tablename=ATTLOG,fielddesc=*,filter=Time>=${formattedDate}`;

        await prisma.deviceCommand.create({
          data: {
            tenantId,
            deviceId: id,
            command: recoveryCommand,
            status: 'pending'
          }
        });

        res.json({ message: 'Log recovery command queued' });
      } catch (error) {
        console.error('Log recovery error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    export default router;
=======
  } catch (error) {
    console.error('Sync device users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
