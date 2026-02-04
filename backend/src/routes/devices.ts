import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all devices
router.get('/', async (req, res) => {
  try {
    const { isActive, status } = req.query;

    const tenantId = (req as any).user.tenantId;

    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (status) where.status = status as string;

    const devices = await prisma.device.findMany({
      where,
      include: {
        rawDeviceLogs: false,
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
    const tenantId = (req as any).user.tenantId;

    const device = await prisma.device.findFirst({
      where: { id, tenantId },
      include: {
        rawDeviceLogs: false,
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
    const { deviceId, name, ipAddress, port, location, protocol, serialNumber } = req.body;
    const tenantId = (req as any).user.tenantId;

    const device = await prisma.device.create({
      data: {
        tenantId,
        deviceId: serialNumber || deviceId,
        name,
        ipAddress,
        port,
        location,
        protocol: protocol || 'ESSL_ADMS',
        username: req.body.username,
        password: req.body.password,
        config: req.body.databaseName ? JSON.stringify({ databaseName: req.body.databaseName }) : undefined,
      },
    });

    res.status(201).json(device);
  } catch (error: any) {
    console.error('Create device error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A device with this Serial Number or Configuration already exists in this tenant.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update device
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenantId;
    const { deviceId, name, ipAddress, port, location, isActive, status, protocol, serialNumber, username, password, databaseName } = req.body;

    const device = await prisma.device.updateMany({
      where: { id, tenantId },
      data: {
        deviceId: serialNumber || deviceId,
        name,
        ipAddress,
        port,
        location,
        isActive,
        status,
        protocol,
        username,
        password,
        config: databaseName ? JSON.stringify({ databaseName }) : undefined,
      },
    });

    res.json(device);
  } catch (error: any) {
    console.error('Update device error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A device with this Serial Number or Configuration already exists.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete device
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenantId;

    await prisma.device.deleteMany({
      where: { id, tenantId },
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
    // This functionality might need to be adapted for specific hardware/protocol logic
    // For now we just return success as a placeholder if not strictly using SQL Sync
    res.json({
      message: 'Device users sync logic placeholder',
      count: 0
    });
  } catch (error) {
    console.error('Sync device users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// BATCH SYNC: Handling logs from Local Sync Agent (Offline Mode Recovery)
router.post('/sync-batch', async (req, res) => {
  try {
    const { logs } = req.body; // Expecting array of { deviceId, userId, timestamp, ... }
    const tenantId = (req as any).user.tenantId;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'No logs provided' });
    }

    let count = 0;

    // Process logs in transaction or batch
    // This is a simplified implementation
    for (const log of logs) {
      const device = await prisma.device.findFirst({
        where: { deviceId: log.deviceId, tenantId }
      });

      if (device) {
        // Use upsert to avoid duplicates
        const uniqueId = `LOCAL_${log.deviceId}_${log.userId}_${new Date(log.timestamp).getTime()}`;

        await prisma.rawDeviceLog.upsert({
          where: { id: uniqueId },
          create: {
            id: uniqueId,
            tenantId,
            deviceId: device.id,
            userId: log.userId,
            deviceUserId: log.userId,
            userName: log.userName || 'Unknown',
            timestamp: new Date(log.timestamp),
            punchTime: new Date(log.timestamp),
            punchType: log.punchType || '0',
            isProcessed: false
          },
          update: {} // Do nothing if exists
        });
        count++;
      }
    }

    res.json({
      message: 'Batch sync completed',
      processed: count,
      total: logs.length
    });

  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Queue a log recovery command for a device
router.post('/:id/log-recovery', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate } = req.body; // YYYY-MM-DD
    const tenantId = (req as any).user.tenantId;

    const device = await prisma.device.findFirst({
      where: { id, tenantId }
    });

    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Command format for ADMS: C:415:DATA QUERY tablename=ATTLOG,fielddesc=*,filter=...
    // If no date provided, use filter=* (Nuclear Option) to avoid "Time vs TimeStr" issues
    const recoveryCommand = startDate
      ? `C:415:DATA QUERY tablename=ATTLOG,fielddesc=*,filter=Time>=${startDate.replace(/-/g, '')}000000`
      : `C:415:DATA QUERY tablename=ATTLOG,fielddesc=*,filter=*`;

    await prisma.deviceCommand.create({
      data: {
        tenantId,
        deviceId: id,
        commandType: recoveryCommand,
        status: 'PENDING'
      }
    });

    res.json({ message: 'Log recovery command queued' });
  } catch (error) {
    console.error('Log recovery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
