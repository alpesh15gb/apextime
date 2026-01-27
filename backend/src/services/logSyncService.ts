import { getSqlPool, prisma } from '../config/database';
import sql from 'mssql';
import logger from '../config/logger';

interface RawLog {
  DeviceLogId: number;
  DeviceId: number;
  UserId: string;
  LogDate: Date;
}

interface ProcessedAttendance {
  employeeId: string;
  date: Date;
  firstIn: Date | null;
  lastOut: Date | null;
  workingHours: number | null;
  totalPunches: number;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  lateArrival: number;
  earlyDeparture: number;
  status: string;
}

export async function startLogSync(): Promise<void> {
  const syncStartTime = new Date();
  let recordsSynced = 0;
  let status = 'success';
  let message = '';

  try {
    logger.info('Starting log sync from SQL Server...');
    console.log(`[${new Date().toISOString()}] Starting log sync...`);

    // Get last sync time
    const lastSync = await prisma.syncStatus.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const lastSyncTime = lastSync?.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get SQL Server connection
    const pool = await getSqlPool();

    // Get current date for monthly table calculation
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Try to get logs from multiple possible table names
    let allLogs: RawLog[] = [];

    // Tables to try (main table and monthly partitions)
    const tablesToTry = [
      'DeviceLogs',
      `DeviceLogs_${currentMonth}_${currentYear}`,
      `DeviceLogs_${currentMonth - 1}_${currentYear}`, // Previous month
    ];

    for (const tableName of tablesToTry) {
      try {
        logger.info(`Trying to query table: ${tableName}`);
        const result = await pool.request()
          .input('lastSyncTime', sql.DateTime, lastSyncTime)
          .query<RawLog>(`
            SELECT DeviceLogId, DeviceId, UserId, LogDate
            FROM ${tableName}
            WHERE LogDate > @lastSyncTime
            ORDER BY LogDate ASC
          `);

        logger.info(`Found ${result.recordset.length} logs in ${tableName}`);
        allLogs = [...allLogs, ...result.recordset];
      } catch (error: any) {
        logger.warn(`Table ${tableName} not accessible: ${error.message}`);
      }
    }

    // Deduplicate logs
    const uniqueLogs = new Map<string, RawLog>();
    for (const log of allLogs) {
      const key = `${log.DeviceLogId}`;
      if (!uniqueLogs.has(key)) {
        uniqueLogs.set(key, log);
      }
    }

    logger.info(`Total unique logs to process: ${uniqueLogs.size}`);
    console.log(`Found ${uniqueLogs.size} new logs to process`);

    if (uniqueLogs.size === 0) {
      message = 'No new logs found';
      logger.info(message);
    } else {
      // Store raw device logs (with error handling for each)
      let storedCount = 0;
      for (const log of uniqueLogs.values()) {
        try {
          await prisma.rawDeviceLog.upsert({
            where: {
              id: log.DeviceLogId.toString(),
            },
            update: {
              isProcessed: false,
            },
            create: {
              id: log.DeviceLogId.toString(),
              deviceId: log.DeviceId.toString(),
              userId: log.UserId.toString(),
              punchTime: log.LogDate,
              isProcessed: false,
            },
          });
          storedCount++;
        } catch (error) {
          logger.warn(`Failed to store raw log ${log.DeviceLogId}:`, error);
        }
      }
      logger.info(`Stored ${storedCount} raw logs`);

      // Process attendance
      const processedAttendance = await processAttendanceLogs(Array.from(uniqueLogs.values()));

      // Save processed attendance
      for (const attendance of processedAttendance) {
        try {
          await prisma.attendanceLog.upsert({
            where: {
              employeeId_date: {
                employeeId: attendance.employeeId,
                date: attendance.date,
              },
            },
            update: {
              firstIn: attendance.firstIn,
              lastOut: attendance.lastOut,
              workingHours: attendance.workingHours,
              totalPunches: attendance.totalPunches,
              shiftStart: attendance.shiftStart,
              shiftEnd: attendance.shiftEnd,
              lateArrival: attendance.lateArrival,
              earlyDeparture: attendance.earlyDeparture,
              status: attendance.status,
            },
            create: {
              employeeId: attendance.employeeId,
              date: attendance.date,
              firstIn: attendance.firstIn,
              lastOut: attendance.lastOut,
              workingHours: attendance.workingHours,
              totalPunches: attendance.totalPunches,
              shiftStart: attendance.shiftStart,
              shiftEnd: attendance.shiftEnd,
              lateArrival: attendance.lateArrival,
              earlyDeparture: attendance.earlyDeparture,
              status: attendance.status,
            },
          });

          recordsSynced++;
        } catch (error) {
          logger.error(`Failed to save attendance for ${attendance.employeeId}:`, error);
        }
      }

      // Mark raw logs as processed (safely)
      for (const log of uniqueLogs.values()) {
        try {
          const exists = await prisma.rawDeviceLog.findUnique({
            where: { id: log.DeviceLogId.toString() },
          });
          if (exists) {
            await prisma.rawDeviceLog.update({
              where: { id: log.DeviceLogId.toString() },
              data: { isProcessed: true },
            });
          }
        } catch (error) {
          logger.warn(`Failed to mark log ${log.DeviceLogId} as processed:`, error);
        }
      }

      message = `Successfully synced ${recordsSynced} attendance records from ${uniqueLogs.size} logs`;
      logger.info(message);
      console.log(`[${new Date().toISOString()}] ${message}`);
    }

  } catch (error) {
    status = 'failed';
    message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Log sync failed:', error);
    console.error(`[${new Date().toISOString()}] Log sync failed:`, message);
  } finally {
    // Record sync status
    await prisma.syncStatus.create({
      data: {
        lastSyncTime: syncStartTime,
        recordsSynced,
        status,
        message,
      },
    });
  }
}

async function processAttendanceLogs(logs: RawLog[]): Promise<ProcessedAttendance[]> {
  // Group logs by employee device user ID
  const employeeLogs = new Map<string, RawLog[]>();

  for (const log of logs) {
    const key = log.UserId.toString();
    if (!employeeLogs.has(key)) {
      employeeLogs.set(key, []);
    }
    employeeLogs.get(key)!.push(log);
  }

  const processedResults: ProcessedAttendance[] = [];

  for (const [deviceUserId, userLogs] of employeeLogs) {
    // Find employee by device user ID
    const employee = await prisma.employee.findFirst({
      where: { deviceUserId },
      include: { shift: true },
    });

    if (!employee) {
      logger.warn(`No employee found for device user ID: ${deviceUserId}`);
      continue;
    }

    // Group logs by date
    const logsByDate = new Map<string, RawLog[]>();

    for (const log of userLogs) {
      const dateKey = log.LogDate.toISOString().split('T')[0];
      if (!logsByDate.has(dateKey)) {
        logsByDate.set(dateKey, []);
      }
      logsByDate.get(dateKey)!.push(log);
    }

    // Process each date
    for (const [dateKey, dateLogs] of logsByDate) {
      // Sort logs by time
      dateLogs.sort((a, b) => a.LogDate.getTime() - b.LogDate.getTime());

      const firstIn = dateLogs[0].LogDate;
      const lastOut = dateLogs[dateLogs.length - 1].LogDate;

      // Calculate working hours
      let workingHours: number | null = null;
      if (firstIn && lastOut && firstIn.getTime() !== lastOut.getTime()) {
        const diffMs = lastOut.getTime() - firstIn.getTime();
        workingHours = diffMs / (1000 * 60 * 60);
      }

      // Calculate shift times and late/early indicators
      let shiftStart: Date | null = null;
      let shiftEnd: Date | null = null;
      let lateArrival = 0;
      let earlyDeparture = 0;

      if (employee.shift) {
        const shift = employee.shift;
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);

        // Create shift start/end times for this date
        shiftStart = new Date(dateKey);
        shiftStart.setHours(startHour, startMinute, 0, 0);

        shiftEnd = new Date(dateKey);
        shiftEnd.setHours(endHour, endMinute, 0, 0);

        // Handle overnight shifts
        if (shift.isNightShift || endHour < startHour) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        // Calculate grace periods
        const gracePeriodIn = shift.gracePeriodIn || 0;
        const gracePeriodOut = shift.gracePeriodOut || 0;

        // Check late arrival
        const allowedInTime = new Date(shiftStart.getTime() + gracePeriodIn * 60000);
        if (firstIn > allowedInTime) {
          lateArrival = Math.round((firstIn.getTime() - shiftStart.getTime()) / 60000);
        }

        // Check early departure
        const allowedOutTime = new Date(shiftEnd.getTime() - gracePeriodOut * 60000);
        if (lastOut < allowedOutTime) {
          earlyDeparture = Math.round((shiftEnd.getTime() - lastOut.getTime()) / 60000);
        }
      }

      processedResults.push({
        employeeId: employee.id,
        date: new Date(dateKey),
        firstIn,
        lastOut,
        workingHours,
        totalPunches: dateLogs.length,
        shiftStart,
        shiftEnd,
        lateArrival,
        earlyDeparture,
        status: 'present',
      });
    }
  }

  return processedResults;
}

// Export for manual execution
if (require.main === module) {
  startLogSync()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
