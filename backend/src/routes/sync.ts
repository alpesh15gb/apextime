import express from 'express';
import { getSqlPool, prisma } from '../config/database';
import logger from '../config/logger';
import { startLogSync } from '../services/logSyncService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Trigger manual sync
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Manual sync triggered');
    await startLogSync();
    res.json({ message: 'Sync completed successfully' });
  } catch (error) {
    logger.error('Manual sync failed:', error);
    res.status(500).json({ error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Test SQL Server connection
router.get('/test-connection', async (req, res) => {
  try {
    const pool = await getSqlPool();

    // Test basic query
    const result = await pool.request().query('SELECT @@VERSION as version');

    // Test DeviceLogs table exists
    const deviceLogsResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM DeviceLogs
    `);

    res.json({
      status: 'connected',
      sqlServerVersion: result.recordset[0]?.version?.substring(0, 100),
      deviceLogsCount: deviceLogsResult.recordset[0]?.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SQL Server connection test failed:', error);
    res.status(500).json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get sync status
router.get('/status', async (req, res) => {
  try {
    const [lastSync, syncHistory] = await Promise.all([
      prisma.syncStatus.findFirst({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.syncStatus.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Count employees with deviceUserId
    const employeesWithDeviceId = await prisma.employee.count({
      where: { deviceUserId: { not: null } }
    });

    res.json({
      lastSync,
      syncHistory,
      stats: {
        employeesWithDeviceId,
        totalEmployees: await prisma.employee.count()
      }
    });
  } catch (error) {
    logger.error('Get sync status failed:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Preview logs from SQL Server (without syncing)
router.get('/preview', async (req, res) => {
  try {
    const { limit = '10', table = 'DeviceLogs' } = req.query;
    const pool = await getSqlPool();

    // Get last sync time
    const lastSync = await prisma.syncStatus.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const lastSyncTime = lastSync?.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent logs from specified table
    const result = await pool.request()
      .input('lastSyncTime', lastSyncTime)
      .query(`
        SELECT TOP ${parseInt(limit as string)}
          DeviceLogId, DeviceId, UserId, LogDate
        FROM ${table}
        WHERE LogDate > @lastSyncTime
        ORDER BY LogDate DESC
      `);

    res.json({
      lastSyncTime,
      table,
      logsFound: result.recordset.length,
      logs: result.recordset
    });
  } catch (error) {
    logger.error('Preview logs failed:', error);
    res.status(500).json({ error: 'Failed to preview logs' });
  }
});

// Discover available tables
router.get('/discover-tables', async (req, res) => {
  try {
    const pool = await getSqlPool();

    // Get all tables matching DeviceLogs pattern
    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME LIKE 'DeviceLogs%'
      ORDER BY TABLE_NAME
    `);

    // Get row counts for each table
    const tablesWithCounts = [];
    for (const row of result.recordset) {
      try {
        const countResult = await pool.request().query(`
          SELECT COUNT(*) as count FROM ${row.TABLE_NAME}
        `);
        tablesWithCounts.push({
          name: row.TABLE_NAME,
          rowCount: countResult.recordset[0].count
        });
      } catch (e) {
        tablesWithCounts.push({
          name: row.TABLE_NAME,
          rowCount: null,
          error: 'Failed to query'
        });
      }
    }

    res.json({
      tables: tablesWithCounts
    });
  } catch (error) {
    logger.error('Discover tables failed:', error);
    res.status(500).json({ error: 'Failed to discover tables' });
  }
});

// Get unmatched user IDs from recent logs
router.get('/unmatched-users', async (req, res) => {
  try {
    const pool = await getSqlPool();

    // Discover all DeviceLogs tables
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME LIKE 'DeviceLogs%'
      ORDER BY TABLE_NAME
    `);

    // Get unique user IDs from all tables
    const allUserIds = new Set<string>();

    for (const row of tablesResult.recordset) {
      try {
        const result = await pool.request().query(`
          SELECT DISTINCT UserId
          FROM ${row.TABLE_NAME}
        `);
        for (const record of result.recordset) {
          allUserIds.add(record.UserId.toString());
        }
      } catch (e) {
        logger.warn(`Failed to query ${row.TABLE_NAME} for user IDs`);
      }
    }

    const userIds = Array.from(allUserIds).sort();

    // Check which ones have matching employees
    const employees = await prisma.employee.findMany({
      where: {
        deviceUserId: {
          in: userIds
        }
      },
      select: {
        id: true,
        deviceUserId: true,
        firstName: true,
        lastName: true
      }
    });

    const matchedUserIds = new Set(employees.map(e => e.deviceUserId));
    const unmatchedUserIds = userIds.filter((id: string) => !matchedUserIds.has(id));

    res.json({
      totalUniqueUsers: userIds.length,
      matchedCount: matchedUserIds.size,
      unmatchedCount: unmatchedUserIds.length,
      unmatchedUserIds,
      matchedEmployees: employees
    });
  } catch (error) {
    logger.error('Get unmatched users failed:', error);
    res.status(500).json({ error: 'Failed to get unmatched users' });
  }
});

export default router;
