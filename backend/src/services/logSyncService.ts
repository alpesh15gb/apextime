import { getDynamicSqlPool, getDynamicHikPool, prisma, BiometricConfig } from '../config/database';
import { Tenant } from '@prisma/client';

import sql from 'mssql';
import logger from '../config/logger';
import { normalizeName, parseEmployeeName, getCoreId } from '../utils/nameUtils';
interface RawLog {
  DeviceLogId: number;
  DeviceId: number | string;
  UserId: string;
  LogDate: Date;
  TableName?: string;
  UserName?: string;
}

interface ProcessedAttendance {
  employeeId: string;
  date: Date;
  firstIn: Date | null;
  lastOut: Date | null;
  workingHours: number;
  totalPunches: number;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  lateArrival: number;
  earlyDeparture: number;
  status: string;
}

// Cache for created employees to avoid repeated lookups
const employeeCache = new Map<string, string>(); // deviceUserId -> employeeId

export async function startLogSync(fullSync: boolean = false): Promise<void> {
  const activeTenants = await prisma.tenant.findMany({ where: { isActive: true } });

  if (activeTenants.length === 0) {
    logger.info('No active tenants found for sync.');
    return;
  }

  logger.info(`Starting multi-tenant log sync for ${activeTenants.length} tenants...`);

  for (const tenant of activeTenants) {
    try {
      await syncForTenant(tenant, fullSync);
    } catch (err) {
      logger.error(`Sync failed for tenant ${tenant.name} (${tenant.id}):`, err);
    }
  }
}

async function syncForTenant(tenant: Tenant, fullSync: boolean = false): Promise<void> {
  const syncStartTime = new Date();
  let recordsSynced = 0;
  let employeesCreated = 0;
  let status = 'success';
  let message = '';

  try {
    const biometricSettings = (tenant.settings as any)?.biometric as BiometricConfig;
    const hikSettings = (tenant.settings as any)?.hik as BiometricConfig;

    logger.info(`Starting sync for tenant: ${tenant.name} (${tenant.id})`);

    // Get last sync time
    let lastSyncTime: Date;

    if (fullSync) {
      // Full sync: go back to 2020-01-01 to capture all historical data
      lastSyncTime = new Date('2020-01-01');
      logger.info('Full sync mode: processing all historical data from 2020-01-01');
    } else {
      const lastSync = await prisma.syncLog.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      });
      lastSyncTime = lastSync?.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    let allLogs: RawLog[] = [];

    /* --- SQL Server Connection (SQL_LOGS) - DISABLED FOR NOW
    // Source 1: Legacy Tenant Settings
    const sqlConfigs: BiometricConfig[] = [];

    if (biometricSettings && biometricSettings.server) {
      sqlConfigs.push(biometricSettings);
    }

    // Source 2: Devices with Protocol 'SQL_LOGS' or 'SQL_MIRROR'
    const sqlDevices = await prisma.device.findMany({
      where: {
        tenantId: tenant.id,
        protocol: { in: ['SQL_LOGS', 'SQL_MIRROR', 'HIKCENTRAL_SQL'] },
        isActive: true
      }
    });

    for (const d of sqlDevices) {
      if (d.ipAddress && d.username && d.password) {
        let dbName = 'eTimeTrackLite1';
        try {
          if (d.config) {
            const parsed = JSON.parse(d.config);
            if (parsed.databaseName) dbName = parsed.databaseName;
          }
        } catch (e) { }

        sqlConfigs.push({
          server: d.ipAddress.trim(),
          port: d.port || 1433,
          user: d.username.trim(),
          password: d.password.trim(),
          database: dbName.trim()
        });
      }
    }

    // Iterate over all SQL configurations
    for (const config of sqlConfigs) {
      try {
        // Create a unique key for the pool to avoid collisions if multiple SQL servers exist
        const poolKey = `${tenant.id}_${config.server}_${config.database}`;
        logger.info(`Attempting SQL connection: ${config.server}:${config.port} DB: ${config.database} User: ${config.user}`);
        const pool = await getDynamicSqlPool(config, poolKey);
        // DYNAMIC TABLE SUPPORT
        const tablesResult = await pool.request().query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME LIKE 'DeviceLogs%' 
             OR TABLE_NAME IN ('HikvisionLogs', 'v_events', 't_event_log', 't_attendance_record', 'v_attendance_record')
        `);
        const tables = tablesResult.recordset.map((r: any) => r.TABLE_NAME);
        console.log(`[SYNC] Found ${tables.length} potential sync tables.`);

        for (const tableName of tables) {
          try {
            // Get columns for this table to avoid "Invalid Column" errors
            const colsResult = await pool.request().query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'
            `);
            const colNames = colsResult.recordset.map((c: any) => c.COLUMN_NAME.toLowerCase());

            let query = '';
            const isHikTable = tableName.toLowerCase().includes('hik') || tableName.toLowerCase().includes('event') || tableName.toLowerCase().includes('attendance');

            if (isHikTable) {
              // Determine best columns dynamically
              const idCol = colNames.find(c => ['logid', 'event_id', 'id', 'recordid'].includes(c)) || '1';
              const userCol = colNames.find(c => ['person_id', 'employee_id', 'user_id', 'person_code'].includes(c)) || 'UserId';
              const dateCol = colNames.find(c => ['access_datetime', 'event_time', 'time_stamp', 'logdate', 'punch_time', 'datetime'].includes(c));
              const deviceCol = colNames.find(c => ['serial_no', 'device_serial', 'device_name', 'machine_id'].includes(c)) || "'SQL_SOURCE'";
              const nameCol = colNames.find(c => ['person_name', 'name', 'employee_name', 'emp_name'].includes(c));

              if (!dateCol || !userCol) {
                logger.debug(`Skipping table ${tableName}: Required columns (Date/User) not found.`);
                continue;
              }

              query = `
                    SELECT 
                        ${idCol} as DeviceLogId, 
                        ${deviceCol} as DeviceId, 
                        ${userCol} as UserId, 
                        ${dateCol} as LogDate, 
                        ${nameCol ? nameCol + ' as Name' : "NULL as Name"},
                        '${tableName}' as TableName
                    FROM ${tableName}
                    WHERE ${dateCol} > @lastSyncTime
                    ORDER BY ${dateCol} ASC
                `;
            } else {
              // eTimeTrackLite Schema
              query = `
                    SELECT DeviceLogId, DeviceId, UserId, LogDate, NULL as Name, '${tableName}' as TableName
                    FROM ${tableName}
                    WHERE LogDate > @lastSyncTime
                    ORDER BY LogDate ASC
                `;
            }

            const result = await pool.request()
              .input('lastSyncTime', sql.DateTime, lastSyncTime)
              .query<any>(query);

            for (const log of result.recordset) {
              if (log.Name && log.UserId) {
                const uId = log.UserId.toString();
                if (!deviceUserInfoCache.has(uId)) {
                  deviceUserInfoCache.set(uId, {
                    UserId: uId,
                    Name: log.Name,
                    DeviceId: 0
                  });
                }
              }
              // Map SQL Name to RawLog UserName for identity protection
              allLogs.push({ ...log, UserName: log.Name?.toString() });
            }
          } catch (tableErr) {
            logger.warn(`Failed to query table ${tableName}:`, tableErr);
          }
        }
      } catch (err) {
        logger.error(`SQL Sync failed for tenant ${tenant.id} source ${config.server}:`, err);
      }
    }

    // --- HikCentral Sync Start ---
    if (hikSettings) {
      try {
        const hikPool = await getDynamicHikPool(hikSettings, tenant.id);
        const hikResult = await hikPool.request().query(`
          SELECT TOP 5000
            LogId, person_id, access_datetime, device_name, serial_no, person_name, SyncedToApex
          FROM HikvisionLogs
          WHERE SyncedToApex IS NULL OR SyncedToApex = 0
          ORDER BY access_datetime ASC
        `);

        const hikLogs: RawLog[] = hikResult.recordset.map((row: any) => {
          if (row.person_name && row.person_id) {
            const pName = row.person_name.toString().trim();
            const pId = row.person_id.toString();

            if (pName && !/^\d+$/.test(pName)) {
              const existing = deviceUserInfoCache.get(pId);
              if (!existing || /^\d+$/.test(existing.Name)) {
                deviceUserInfoCache.set(pId, {
                  UserId: pId,
                  Name: pName,
                  DeviceId: 0,
                  DepartmentName: 'HikCentral Internal'
                });
              }
            }
          }

          return {
            DeviceLogId: row.LogId,
            DeviceId: row.serial_no || row.device_name || 'HIK_UNKNOWN',
            UserId: row.person_id || 'UNKNOWN',
            LogDate: row.access_datetime,
            TableName: 'HikvisionLogs',
            UserName: row.person_name?.toString()
          };
        });

        allLogs = [...allLogs, ...hikLogs];

        if (hikLogs.length > 0) {
          const logIds = hikLogs.map(l => l.DeviceLogId).join(',');
          await hikPool.request().query(`
            UPDATE HikvisionLogs
            SET SyncedToApex = 1
            WHERE LogId IN (${logIds})
          `);
        }
      } catch (hikErr) {
        logger.error(`HikCentral sync failed for tenant ${tenant.id}:`, hikErr);
      }
    } */
    // --- HikCentral Sync End ---

    // ALSO include logs that are already in RawDeviceLog but haven't been processed yet
    // This allows us to retry processing logs where employees were missing in previous runs
    const staleLogs = await prisma.rawDeviceLog.findMany({
      where: {
        tenantId: tenant.id,
        isProcessed: false
      },
      take: 200000,
      orderBy: { timestamp: 'desc' } // Prioritize recent punches
    });

    if (staleLogs.length > 0) {
      logger.info(`Adding ${staleLogs.length} unprocessed logs from database archive to current sync cycle.`);
      for (const sl of staleLogs) {
        // Map back to RawLog format
        // The ID format is TaskName_DeviceId_DeviceLogId or TableName_DeviceId_DeviceLogId
        const parts = sl.id.split('_');
        const dLId = parseInt(parts[parts.length - 1]) || 0;

        allLogs.push({
          DeviceLogId: dLId,
          DeviceId: sl.deviceId,
          UserId: sl.userId!,
          LogDate: sl.punchTime!,
          TableName: parts[0],
          UserName: (sl as any).userName
        });
      }
    }

    // Deduplicate logs using a globally unique key: TableName + DeviceId + DeviceLogId
    const uniqueLogs = new Map<string, RawLog>();
    for (const log of allLogs) {
      const key = `${log.TableName}_${log.DeviceId}_${log.DeviceLogId}`;
      if (!uniqueLogs.has(key)) {
        uniqueLogs.set(key, log);
      }
    }

    logger.info(`Total unique logs to process (New + Unprocessed): ${uniqueLogs.size}`);
    console.log(`Found ${uniqueLogs.size} new logs to process`);

    if (uniqueLogs.size === 0) {
      message = 'No new logs found';
      logger.info(message);
    } else {
      // Pre-fetch all existing employees with deviceUserId or sourceEmployeeId
      const existingEmployees = await prisma.employee.findMany({
        where: {
          tenantId: tenant.id,
          OR: [
            { deviceUserId: { not: null } },
            { sourceEmployeeId: { not: null } }
          ]
        },
        select: { id: true, deviceUserId: true, sourceEmployeeId: true }
      });

      for (const emp of existingEmployees) {
        if (emp.sourceEmployeeId) {
          employeeCache.set(`SID:${emp.sourceEmployeeId}`, emp.id);

        }
        if (emp.deviceUserId) {
          employeeCache.set(emp.deviceUserId, emp.id);

        }
      }
      logger.info(`Loaded ${employeeCache.size} employees into cache`);

      // Pre-fetch existing devices
      const existingDevices = await prisma.device.findMany({
        where: { tenantId: tenant.id }
      });
      const deviceMap = new Map<string, string>(); // machineId -> internalUuid
      const existingDeviceIds = new Set(existingDevices.map(d => d.deviceId));

      for (const log of uniqueLogs.values()) {
        const dId = log.DeviceId.toString();

        // Find match in existing devices
        const matched = existingDevices.find(d => d.deviceId === dId);
        if (matched) {
          deviceMap.set(dId, matched.id);
        } else {
          // STRICT MODE: If device not found, SKIP. Do NOT create generic SQL source.
          // This prevents ghost devices from reappearing.
          // The user must register the device ID (SN) in the dashboard manually.
          if (!matched) {
            // logger.warn(`Skipping log from unknown device: ${dId}`);
          }
        }
      }

      // Store raw device logs (with error handling for each)
      let storedCount = 0;
      let duplicateCount = 0;
      for (const log of uniqueLogs.values()) {
        try {
          const internalDeviceId = deviceMap.get(log.DeviceId.toString());
          if (!internalDeviceId) continue;

          // Synthesize a globally unique record ID
          const uniqueRecordId = `${log.TableName || 'DL'}_${log.DeviceId}_${log.DeviceLogId}`;

          await prisma.rawDeviceLog.upsert({
            where: {
              deviceId_deviceUserId_timestamp_tenantId: {
                deviceId: internalDeviceId,
                deviceUserId: log.UserId.toString(),
                timestamp: log.LogDate,
                tenantId: tenant.id
              }
            },
            update: {
              // If it exists, we might want to update the original log ID if this one is from a "better" table
              // but for now, just leaving it alone is fine.
            },
            create: {
              id: uniqueRecordId,
              tenantId: tenant.id,
              deviceId: internalDeviceId,
              userId: log.UserId.toString(),
              deviceUserId: log.UserId.toString(),
              userName: log.UserName,
              timestamp: log.LogDate,
              punchTime: log.LogDate,
              isProcessed: false,
            },
          });
          storedCount++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            duplicateCount++;
          } else {
            logger.warn(`Failed to store raw log ${log.DeviceLogId}: ${error.message}`);
          }
        }
      }
      console.log(`[STORAGE] Committed ${storedCount} raw logs (${duplicateCount} duplicates skipped).`);
      logger.info(`Stored ${storedCount} raw logs`);

      /* Load device user info from SQL Server if available - DISABLED FOR NOW
      for (const config of sqlConfigs) {
        try {
          const poolKey = `${tenant.id}_${config.server}_${config.database}`;
          const pool = await getDynamicSqlPool(config, poolKey);
          await loadDeviceUserInfoFromSqlServer(pool);
          logger.info(`Loaded user info from SQL source ${config.server}`);
        } catch (err) {
          logger.warn(`Could not load device user info from ${config.server} for tenant ${tenant.id}:`, err);
        }
      }
      */

      // Auto-create employees if they don't exist
      const uniqueUserIds = new Set<string>();
      for (const log of uniqueLogs.values()) {
        uniqueUserIds.add(log.UserId.toString());
      }

      for (const userId of uniqueUserIds) {
        if (!employeeCache.has(userId)) {
          try {
            // Check if this userId maps to a sourceEmployeeId that already exists
            const userInfo = deviceUserInfoCache.get(userId);
            const sourceId = userInfo?.EmployeeId;

            if (sourceId) {
              const existingBySourceId = existingEmployees.find(e => e.sourceEmployeeId === sourceId.toString());
              if (existingBySourceId) {
                logger.info(`Found existing employee ${existingBySourceId.id} by sourceId ${sourceId} for deviceUserId ${userId}. Linking...`);

                // Update deviceUserId if needed
                if (existingBySourceId.deviceUserId !== userId) {
                  await prisma.employee.update({
                    where: { id: existingBySourceId.id },
                    data: { deviceUserId: userId.toString() }
                  });
                }

                employeeCache.set(userId, existingBySourceId.id);
                // Continue to name check below
              }
            }

            // Name matching is disabled to prevent incorrect mappings for payroll. 
            // Employees must be linked via explicit deviceUserId or employeeCode.

            if (!employeeCache.has(userId)) {
              const newEmployee = await createEmployeeFromDeviceLog(userId, tenant.id);
              if (newEmployee) {
                employeeCache.set(userId, newEmployee.id);
                employeesCreated++;
              }
            }
          } catch (error) {
            logger.error(`Failed to create/link employee for userId ${userId}:`, error);
          }
        }

        // CHECK FOR NAME UPDATES (For both new and existing employees)
        if (employeeCache.has(userId)) {
          const employeeId = employeeCache.get(userId);
          const userInfo = deviceUserInfoCache.get(userId);

          if (userInfo && userInfo.Name && !/^\d+$/.test(userInfo.Name)) {
            const currentEmp = existingEmployees.find(e => e.id === employeeId);
            // If we don't have currentEmp in this scope because it was just created or just added to cache, fetch it or optimize
            // For safety and simplicity in this block, let's just do a direct update if needed

            // We can fetch the employee lightly to check current name
            try {
              const empDb = await prisma.employee.findUnique({ where: { id: employeeId } });
              if (empDb && (empDb.firstName === 'Employee' || /^\d+$/.test(empDb.firstName))) {
                const { firstName, lastName } = parseEmployeeName(userInfo.Name);
                await prisma.employee.update({
                  where: { id: employeeId },
                  data: { firstName, lastName }
                });
                logger.info(`Updated name for employee ${empDb.employeeCode} to ${firstName} ${lastName} from sync source`);
              }
            } catch (err) {
              logger.warn(`Failed to check/update name for ${userId}`, err);
            }
          }
        }
      }

      if (employeesCreated > 0) {
        logger.info(`Created ${employeesCreated} new employees`);
      }

      // Process attendance - NEW HOLISTIC STRATEGY
      // 1. Identify all (UserId, Date) pairs affected by these new logs
      const affectedPairs = new Set<string>();
      for (const log of uniqueLogs.values()) {
        const hours = log.LogDate.getHours();
        let logicalDate = new Date(log.LogDate);
        if (hours < 8) {
          logicalDate.setDate(logicalDate.getDate() - 1);
        }
        // Strict IST: Normalize to 00:00:00 local time
        logicalDate.setHours(0, 0, 0, 0);
        const dateStr = logicalDate.toLocaleDateString('en-CA');
        affectedPairs.add(`${log.UserId}|${dateStr}`);
      }

      logger.info(`Processing attendance for ${affectedPairs.size} employee-day pairs...`);

      for (const pair of affectedPairs) {
        try {
          const [uId, dStr] = pair.split('|');
          const targetDate = new Date(dStr);
          // To support night shifts, we need to fetch logs from 8 hours before 
          // and up to 24 hours after. Example: For Feb 2nd, fetch from Feb 1st 4 PM 
          // to Feb 3rd 4 AM.
          const windowStart = new Date(targetDate.getTime() - 8 * 60 * 60 * 1000);
          const windowEnd = new Date(targetDate.getTime() + 32 * 60 * 60 * 1000);

          const allRawLogsMatch = await prisma.rawDeviceLog.findMany({
            where: {
              userId: uId,
              punchTime: {
                gte: windowStart,
                lt: windowEnd
              }
            },
            orderBy: { punchTime: 'asc' }
          });

          if (allRawLogsMatch.length === 0) continue;

          // Convert to RawLog format for processor
          const formattedLogs: RawLog[] = allRawLogsMatch.map(rl => ({
            DeviceLogId: parseInt(rl.id.split('_').pop() || '0'), // Handle string IDs if composite
            DeviceId: rl.deviceId, // Keep as string or convert if needed. The processor expects it.

            UserId: rl.userId,
            LogDate: rl.punchTime
          }));

          // Process this specific day for this specific employee
          const processingResults = await processAttendanceLogs(formattedLogs);

          for (const attendance of processingResults) {
            await prisma.attendanceLog.upsert({
              where: {
                employeeId_date_tenantId: {
                  employeeId: attendance.employeeId,
                  date: attendance.date,
                  tenantId: tenant.id,
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
                tenant: { connect: { id: tenant.id } },
                employee: { connect: { id: attendance.employeeId } }
              },
            });
            recordsSynced++;
          }
        } catch (error) {
          logger.error(`Failed to process/save attendance for pair ${pair}:`, error);
        }
      }

      // Mark raw logs as processed for employees that exist
      let markedCount = 0;
      for (const log of uniqueLogs.values()) {
        try {
          const employeeId = employeeCache.get(log.UserId.toString());
          if (employeeId) {
            // Reconstruct the unique ID used during storage
            const uniqueRecordId = log.TableName?.startsWith('HIK_DIRECT')
              ? (log.DeviceLogId > 1000000 ? `HIK_DIRECT_${log.DeviceId}_${log.UserId}_${log.DeviceLogId}` : `${log.TableName}_${log.DeviceId}_${log.DeviceLogId}`)
              : `${log.TableName || 'DL'}_${log.DeviceId}_${log.DeviceLogId}`;

            await prisma.rawDeviceLog.update({
              where: { id: uniqueRecordId },
              data: { isProcessed: true },
            }).catch(() => {
              // Fallback for older IDs or direct push IDs
              return prisma.rawDeviceLog.updateMany({
                where: {
                  userId: log.UserId.toString(),
                  punchTime: log.LogDate,
                  tenantId: tenant.id
                },
                data: { isProcessed: true }
              });
            });
            markedCount++;
          }
        } catch (error) {
          // logger.warn(`Failed to mark log ${log.DeviceLogId} as processed:`, error);
        }
      }
      logger.info(`Marked ${markedCount} logs as processed`);

      if (recordsSynced === 0 && storedCount > 0) {
        message = `Stored ${storedCount} logs but no attendance records created. Check employee creation.`;
      } else {
        message = `Successfully synced ${recordsSynced} attendance records from ${uniqueLogs.size} device logs`;
        if (employeesCreated > 0) {
          message += ` (${employeesCreated} new employees created)`;
        }
      }
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
    await prisma.syncLog.create({
      data: {
        tenantId: tenant.id,
        lastSyncTime: syncStartTime,
        recordCount: recordsSynced,
        status,
        message,
      },
    });

    // Clear cache
    employeeCache.clear();
    deviceUserInfoCache.clear();
  }
}

interface DeviceUserInfo {
  UserId: string;
  Name: string;
  DeviceId: number;
  EmployeeId?: string;
  Designation?: string;
  DepartmentId?: string;
  DepartmentName?: string;
}

// Cache for device user info from SQL Server
const deviceUserInfoCache = new Map<string, DeviceUserInfo>();

async function loadDeviceUserInfoFromSqlServer(pool: sql.ConnectionPool): Promise<void> {
  try {
    const allTablesResult = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES");
    const allTables = allTablesResult.recordset.map((r: any) => r.TABLE_NAME);
    logger.info(`SQL Source Tables: ${allTables.join(', ')}`);
    console.log(`[SYNC] Full SQL Table List: ${allTables.join(', ')}`);

    const tablesResult = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('Employees', 't_person', 'Person', 't_person_info', 'v_person', 't_person_base')");
    const tables = tablesResult.recordset.map((r: any) => r.TABLE_NAME.toLowerCase());
    let usersList: any[] = [];

    if (tables.includes('employees')) {
      const result = await pool.request().query(`
        SELECT e.EmployeeCodeInDevice as UserId, e.EmployeeId, e.EmployeeName as Name, e.Designation, d.DepartmentFName as DepartmentName
        FROM Employees e
        LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
        WHERE e.EmployeeCodeInDevice IS NOT NULL AND e.Status = 'Working'
      `);
      usersList = result.recordset.map(u => ({ ...u, Name: u.Name }));
      logger.info(`Source matched eTimeTrack Schema. Found ${usersList.length} users.`);
    } else if (tables.includes('t_person') || tables.includes('person') || tables.includes('t_person_info') || tables.includes('v_person') || tables.includes('t_person_base')) {
      const table = tables.includes('t_person') ? 't_person' :
        (tables.includes('person') ? 'Person' :
          (tables.includes('t_person_info') ? 't_person_info' :
            (tables.includes('v_person') ? 'v_person' : 't_person_base')));

      logger.info(`Attempting to load names from HikCentral table: ${table}`);
      const result = await pool.request().query(`
            SELECT 
                COALESCE(person_id, id, employee_no) as UserId, 
                COALESCE(person_name, name, CAST(firstName as varchar) + ' ' + CAST(lastName as varchar)) as Name,
                COALESCE(department_name, dept_name) as DepartmentName
            FROM ${table}
        `);
      usersList = result.recordset.map(u => ({ ...u, Name: u.Name }));
      logger.info(`Source matched HikCentral Schema. Found ${usersList.length} users in ${table}.`);
      console.log(`[SYNC] Found ${usersList.length} user names in table: ${table}`);
    }

    for (const user of usersList) {
      const deviceUserIdStr = user.UserId?.toString();
      if (!deviceUserIdStr) continue;

      deviceUserInfoCache.set(deviceUserIdStr, {
        UserId: deviceUserIdStr,
        Name: user.Name || `User ${deviceUserIdStr}`,
        DeviceId: 0,
        EmployeeId: user.EmployeeId?.toString(),
        Designation: user.Designation,
        DepartmentName: user.DepartmentName,
      });
    }

    logger.info(`Loaded ${deviceUserInfoCache.size} device users from SQL Server`);
  } catch (error) {
    logger.error('Failed to load device user info from SQL Server:', error);
  }
}

// Utility removed as it's now in src/utils/nameUtils.ts

async function getOrCreateDepartment(departmentName: string, tenantId: string): Promise<string | null> {
  if (!departmentName || departmentName.trim() === '') {
    return null;
  }

  const deptCode = departmentName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

  try {
    // Try to find existing department by code and tenant
    const existing = await prisma.department.findFirst({
      where: { code: deptCode, tenantId }
    });

    if (existing) {
      return existing.id;
    }

    // Create new department
    const newDept = await prisma.department.create({
      data: {
        tenantId,
        name: departmentName,
        code: deptCode,
        isActive: true,
      }
    });

    logger.info(`Created new department: ${departmentName} (${deptCode}) for tenant ${tenantId}`);
    return newDept.id;
  } catch (error) {
    logger.error(`Failed to create department ${departmentName}:`, error);
    return null;
  }
}

async function getOrCreateDesignation(designationName: string, tenantId: string): Promise<string | null> {
  if (!designationName || designationName.trim() === '') {
    return null;
  }

  const desigCode = designationName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

  try {
    // Try to find existing designation
    const existing = await prisma.designation.findUnique({
      where: { code_tenantId: { code: desigCode, tenantId } }
    });

    if (existing) {
      return existing.id;
    }

    // Create new designation
    const newDesig = await prisma.designation.create({
      data: {
        tenantId,
        name: designationName,
        code: desigCode,
        isActive: true,
      }
    });

    logger.info(`Created new designation: ${designationName} (${desigCode}) for tenant ${tenantId}`);
    return newDesig.id;
  } catch (error) {
    logger.error(`Failed to create designation ${designationName}:`, error);
    return null;
  }
}

async function lookupProperEmployeeName(deviceUserId: string): Promise<string | null> {
  // If deviceUserId is numeric, try to find the HO-prefixed version
  if (/^\d + $ /.test(deviceUserId)) {
    const hoCode = `HO${deviceUserId.padStart(3, '0')}`;
    const hoInfo = deviceUserInfoCache.get(hoCode);
    if (hoInfo?.Name && !/^\d+$/.test(hoInfo.Name.trim())) {
      return hoInfo.Name;
    }
  }
  return null;
}

async function createEmployeeFromDeviceLog(deviceUserId: string, tenantId: string) {
  try {
    // Get user info from cache
    const userInfo = deviceUserInfoCache.get(deviceUserId);

    // Try to find proper name from HO-prefixed code if current name is just a number
    let effectiveName = userInfo?.Name;
    if (!effectiveName || /^\d+$/.test(effectiveName.trim())) {
      const properName = await lookupProperEmployeeName(deviceUserId);
      if (properName) {
        effectiveName = properName;
        logger.info(`Found proper name for ${deviceUserId} from HO code: ${properName}`);
      }
    }

    // Generate employee code from deviceUserId (ensure it's unique)
    const employeeCode = deviceUserId.toString();

    // Get or create department and designation
    let departmentId: string | null = null;
    let designationId: string | null = null;

    if (userInfo?.DepartmentName) {
      departmentId = await getOrCreateDepartment(userInfo.DepartmentName, tenantId);
    }

    if (userInfo?.Designation) {
      designationId = await getOrCreateDesignation(userInfo.Designation, tenantId);
    }

    // FUZZY MATCHING: Check if an employee with this name already exists without a linked deviceUserId
    if (effectiveName && !/^\d+$/.test(effectiveName.trim())) {
      const { firstName, lastName } = parseEmployeeName(effectiveName);
      const normalizedQuery = normalizeName(firstName, lastName);

      const allEmps = await prisma.employee.findMany({
        where: { tenantId, deviceUserId: null }
      });

      const matched = allEmps.find(e => normalizeName(e.firstName, e.lastName) === normalizedQuery);
      if (matched) {
        logger.info(`Fuzzy matched ${effectiveName} to existing employee record ${matched.employeeCode}`);
        return await prisma.employee.update({
          where: { id: matched.id },
          data: {
            deviceUserId: deviceUserId.toString(),
            sourceEmployeeId: userInfo?.EmployeeId?.toString(),
            departmentId: departmentId || matched.departmentId,
            designationId: designationId || matched.designationId
          }
        });
      }
    }

    // Check if employee code already exists
    const existing = await prisma.employee.findUnique({
      where: { employeeCode_tenantId: { employeeCode, tenantId } }
    });

    if (existing) {
      // Update existing employee
      const updateData: any = {
        deviceUserId: deviceUserId.toString(),
        sourceEmployeeId: userInfo?.EmployeeId?.toString()
      };

      if (effectiveName && (existing.firstName === `Employee` || /^\d+$/.test(existing.firstName))) {
        const { firstName, lastName } = parseEmployeeName(effectiveName);
        updateData.firstName = firstName;
        updateData.lastName = lastName;
      }

      if (departmentId && !existing.departmentId) updateData.departmentId = departmentId;
      if (designationId && !existing.designationId) updateData.designationId = designationId;

      return await prisma.employee.update({
        where: { id: existing.id },
        data: updateData
      });
    }

    let firstName = 'Employee';
    let lastName = deviceUserId;

    if (effectiveName) {
      const parsed = parseEmployeeName(effectiveName);
      firstName = parsed.firstName;
      lastName = parsed.lastName;
    }

    // Create new employee
    const employee = await prisma.employee.create({
      data: {
        tenantId,
        employeeCode,
        firstName,
        lastName,
        deviceUserId: deviceUserId.toString(),
        sourceEmployeeId: userInfo?.EmployeeId?.toString(),
        departmentId,
        designationId,
        isActive: true,
      }
    });

    logger.info(`Created new employee: ${employeeCode} (${firstName} ${lastName}) with deviceUserId: ${deviceUserId}, department: ${userInfo?.DepartmentName || 'none'}, designation: ${userInfo?.Designation || 'none'}`);
    return employee;
  } catch (error) {
    logger.error(`Failed to create employee for deviceUserId ${deviceUserId}:`, error);
    return null;
  }
}


export async function processAttendanceLogs(logs: RawLog[]): Promise<ProcessedAttendance[]> {
  const employeeLogs = new Map<string, RawLog[]>();

  for (const log of logs) {
    const key = log.UserId.toString();
    if (!employeeLogs.has(key)) employeeLogs.set(key, []);
    employeeLogs.get(key)!.push(log);
  }

  const processedResults: ProcessedAttendance[] = [];

  for (const [deviceUserId, userLogs] of employeeLogs) {
    // STRICT MATCHING ONLY - No fuzzy logic
    const employeeId = employeeCache.get(deviceUserId);

    if (!employeeId) continue;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (!employee) continue;

    // Fetch all shifts for the tenant for "Smart Shift Matching"
    const tenantShifts = await prisma.shift.findMany({
      where: { tenantId: employee.tenantId, isActive: true }
    });

    // 1. Sort logs chronologically
    userLogs.sort((a, b) => a.LogDate.getTime() - b.LogDate.getTime());

    // 2. Identify "Work Sessions"
    // Instead of calendar days, we group punches that are close to each other 
    // or fit within a shift window.

    const sessions = new Map<string, RawLog[]>(); // dateKey -> logs

    for (const log of userLogs) {
      // Process all punches (Joining date filter removed as requested)

      // Determine the Logical Date for this punch
      // A punch belongs to "today" if it's generally during "today's" expected work hours
      // or if it's the first punch after a long break.

      let logicalDate: Date;
      const hours = log.LogDate.getHours();

      // SMART LOGICAL DATE: 
      // If employee has a shift, use it for context. 
      // If shift starts at 7 AM, 5 AM is "Today". 
      // If shift starts at 10 PM, 2 AM is "Yesterday".

      let effectiveShift = employee.shift || tenantShifts[0];
      let shiftStartHour = 9; // Default 9 AM

      if (effectiveShift) {
        const sTime = new Date(effectiveShift.startTime);
        shiftStartHour = sTime.getUTCHours();
      }

      // Threshold: A punch within 6 hours before shift start is "Today"
      // A punch up to 14 hours after shift start is "Today"
      logicalDate = new Date(log.LogDate);

      if (shiftStartHour < 12) {
        // Day Shift (e.g. 7 AM or 9 AM)
        // If punch is between 12 AM and (ShiftStart - 4), it might be "Yesterday's" finish
        if (hours < (shiftStartHour - 4)) {
          logicalDate.setDate(logicalDate.getDate() - 1);
        }
      } else {
        // Night Shift (e.g. 8 PM)
        // If punch is between 12 AM and (ShiftStart - 8), it is definitely "Yesterday's" continuation
        if (hours < (shiftStartHour - 6)) {
          logicalDate.setDate(logicalDate.getDate() - 1);
        }
      }

      const dateKey = logicalDate.toLocaleDateString('en-CA');
      if (!sessions.has(dateKey)) sessions.set(dateKey, []);
      sessions.get(dateKey)!.push(log);
    }

    // 3. Process each session - SIMPLIFIED CALENDAR DAY LOGIC
    // We group strictly by calendar date to avoid "missing" days due to shift logic confusion
    const simpleSessions = new Map<string, RawLog[]>();

    for (const log of userLogs) {
      // STRICT IST GROUPING: Convert UTC to IST (UTC+5:30) before grouping
      // This ensures logs that are technically on different UTC days but same IST day are grouped together
      const istDate = new Date(log.LogDate.getTime() + (5.5 * 60 * 60 * 1000));
      const dateKey = istDate.toISOString().split('T')[0];

      if (!simpleSessions.has(dateKey)) simpleSessions.set(dateKey, []);
      simpleSessions.get(dateKey)!.push(log);
    }

    for (const [dateKey, dateLogs] of simpleSessions) {
      dateLogs.sort((a, b) => a.LogDate.getTime() - b.LogDate.getTime());

      const firstIn = dateLogs[0].LogDate;
      const lastOut = dateLogs.length > 1 ? dateLogs[dateLogs.length - 1].LogDate : undefined;

      let workingHours = 0;
      if (firstIn && lastOut) {
        workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
      }

      // Determine Status based strictly on presence
      let status = 'Absent';
      if (workingHours > 4) status = 'Present';
      else if (workingHours > 0) status = 'Half Day';
      else status = 'Present'; // Even a single punch counts as Present (adjustment needed for payroll later)

      // Correction for single punch
      if (!lastOut) {
        status = 'Present'; // Operator can fix later, but show it as Present!
      }

      processedResults.push({
        employeeId: employeeId,
        date: new Date(dateKey + 'T00:00:00'),
        firstIn: firstIn,
        lastOut: lastOut || null,
        workingHours: Number(workingHours.toFixed(2)),
        totalPunches: dateLogs.length,
        shiftStart: null,
        shiftEnd: null,
        lateArrival: 0,
        earlyDeparture: 0,
        status: status,

      });
    }

    // Old logic removed
  }


  return processedResults;
}


// This function is now mostly handled via per-tenant sync, but left for global manually triggered sync
export async function syncEmployeeNamesFromDeviceUsers(): Promise<{ updated: number; failed: number; deptUpdated: number; desigUpdated: number }> {
  try {
    const activeTenants = await prisma.tenant.findMany({ where: { isActive: true } });
    let totalResults = { updated: 0, failed: 0, deptUpdated: 0, desigUpdated: 0 };

    for (const tenant of activeTenants) {
      const biometricSettings = (tenant.settings as any)?.biometric as BiometricConfig;
      if (!biometricSettings) continue;

      const pool = await getDynamicSqlPool(biometricSettings, tenant.id);
      await loadDeviceUserInfoFromSqlServer(pool);

      const result = await syncNamesForTenant(tenant);
      totalResults.updated += result.updated;
      totalResults.failed += result.failed;
      totalResults.deptUpdated += result.deptUpdated;
      totalResults.desigUpdated += result.desigUpdated;

      deviceUserInfoCache.clear();
    }
    return totalResults;
  } catch (error) {
    logger.error('Global name sync failed:', error);
    throw error;
  }
}

async function syncNamesForTenant(tenant: Tenant): Promise<{ updated: number; failed: number; deptUpdated: number; desigUpdated: number }> {
  try {
    logger.info(`Starting employee name sync for tenant ${tenant.name}...`);

    // Get all employees with deviceUserId
    const employees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } },
    });

    let updated = 0;
    let failed = 0;
    let deptUpdated = 0;
    let desigUpdated = 0;

    for (const employee of employees) {
      if (!employee.deviceUserId) continue;

      const userInfo = deviceUserInfoCache.get(employee.deviceUserId);
      if (!userInfo?.Name) continue;

      // Parse the name from SQL Server
      const { firstName, lastName } = parseEmployeeName(userInfo.Name);

      // Get or create department and designation
      let departmentId: string | null = employee.departmentId;
      let designationId: string | null = employee.designationId;

      if (userInfo?.DepartmentName && !employee.departmentId) {
        departmentId = await getOrCreateDepartment(userInfo.DepartmentName, tenant.id);
      }

      if (userInfo?.Designation && !employee.designationId) {
        designationId = await getOrCreateDesignation(userInfo.Designation, tenant.id);
      }

      // Only update if something changed or was auto-generated
      const currentFullName = `${employee.firstName} ${employee.lastName}`.trim();
      const newFullName = `${firstName} ${lastName}`.trim();

      const shouldUpdateName = currentFullName !== newFullName &&
        (employee.firstName === 'Employee' || currentFullName.includes(employee.deviceUserId));

      const shouldUpdateDept = departmentId && !employee.departmentId;
      const shouldUpdateDesig = designationId && !employee.designationId;

      if (shouldUpdateName || shouldUpdateDept || shouldUpdateDesig) {
        try {
          const updateData: any = {};
          if (shouldUpdateName) {
            updateData.firstName = firstName;
            updateData.lastName = lastName;
          }
          if (shouldUpdateDept) {
            updateData.departmentId = departmentId;
          }
          if (shouldUpdateDesig) {
            updateData.designationId = designationId;
          }

          await prisma.employee.update({
            where: { id: employee.id },
            data: updateData,
          });

          if (shouldUpdateName) {
            logger.info(`Updated employee ${employee.employeeCode} name: ${newFullName}`);
            updated++;
          }
          if (shouldUpdateDept) {
            logger.info(`Updated employee ${employee.employeeCode} department: ${userInfo.DepartmentName}`);
            deptUpdated++;
          }
          if (shouldUpdateDesig) {
            logger.info(`Updated employee ${employee.employeeCode} designation: ${userInfo.Designation}`);
            desigUpdated++;
          }
        } catch (error) {
          logger.error(`Failed to update employee ${employee.employeeCode}:`, error);
          failed++;
        }
      }
    }

    logger.info(`Employee sync complete. Names updated: ${updated}, Departments updated: ${deptUpdated}, Designations updated: ${desigUpdated}, Failed: ${failed}`);
    return { updated, failed, deptUpdated, desigUpdated };
  } catch (error) {
    logger.error('Employee sync failed:', error);
    throw error;
  } finally {
    deviceUserInfoCache.clear();
  }
}
// Historical recovery function - re-processes existing raw logs with improved logic
export async function reprocessHistoricalLogs(startDate?: Date, endDate?: Date, employeeId?: string): Promise<{ pairsProcessed: number; recordsUpdated: number }> {
  try {
    logger.info(`Starting historical re-processing... ${employeeId ? `Employee: ${employeeId}` : 'All employees'}`);
    console.log(`[${new Date().toISOString()}] Starting historical repair...`);

    // Simplified fetch to avoid Prisma validation errors on non-nullable fields
    const existingEmployees = await prisma.employee.findMany({
      select: { id: true, deviceUserId: true, sourceEmployeeId: true, employeeCode: true }
    });

    employeeCache.clear();
    for (const emp of existingEmployees) {
      // STRICT MATCHING ONLY - No fuzzy logic
      if (emp.sourceEmployeeId) {
        employeeCache.set(`SID:${emp.sourceEmployeeId}`, emp.id);
      }
      if (emp.deviceUserId) {
        employeeCache.set(emp.deviceUserId, emp.id);
      }
      if (emp.employeeCode) {
        employeeCache.set(`CODE:${emp.employeeCode}`, emp.id);
      }
    }
    console.log(`Loaded ${employeeCache.size} employee mapping keys into memory for repair.`);

    const where: any = {};
    if (startDate || endDate) {
      where.punchTime = {};
      if (startDate) where.punchTime.gte = startDate;
      if (endDate) where.punchTime.lte = endDate;
    }
    if (employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { deviceUserId: true } });
      if (emp?.deviceUserId) where.userId = emp.deviceUserId;
    }

    // Get unique userId + Date pairs from RawDeviceLog
    const logs = await prisma.rawDeviceLog.findMany({
      where,
      select: { userId: true, punchTime: true },
      orderBy: { punchTime: 'asc' }
    });

    console.log(`Found ${logs.length} raw logs to analyze.`);

    const affectedPairs = new Set<string>();
    for (const log of logs) {
      const dStr = log.punchTime.toLocaleDateString('en-CA');
      affectedPairs.add(`${log.userId}|${dStr}`);
    }

    console.log(`Identified ${affectedPairs.size} employee-day sessions requiring recalculation.`);

    let pairsProcessed = 0;
    let recordsUpdated = 0;

    for (const pair of affectedPairs) {
      try {
        const [uId, dStr] = pair.split('|');
        // Create a 40-hour window around the target date to catch any potentially relevant logs (night shifts)
        const windowStart = new Date(dStr + 'T00:00:00');
        windowStart.setHours(windowStart.getHours() - 8); // Go back 8 hours (into previous day)
        const windowEnd = new Date(dStr + 'T23:59:59');
        windowEnd.setHours(windowEnd.getHours() + 12); // Go forward 12 hours (into next day)

        const dayLogs = await prisma.rawDeviceLog.findMany({
          where: {
            userId: uId,
            punchTime: { gte: windowStart, lt: windowEnd }
          },
          orderBy: { punchTime: 'asc' }
        });

        if (dayLogs.length === 0) continue;

        const formattedLogs: RawLog[] = dayLogs.map(rl => ({
          DeviceLogId: 0,
          DeviceId: rl.deviceId, // Preserve string UUID
          UserId: rl.userId,
          LogDate: rl.punchTime
        }));

        const results = await processAttendanceLogs(formattedLogs);

        // Get tenantId for this specific employee - STRICT MATCHING ONLY
        const empId = employeeCache.get(uId);
        const empForTenant = empId ? await prisma.employee.findUnique({ where: { id: empId }, select: { tenantId: true } }) : null;
        const rlTenantId = empForTenant?.tenantId || '';
        if (!rlTenantId) continue;

        for (const attendance of results) {
          await prisma.attendanceLog.upsert({
            where: {
              employeeId_date_tenantId: {
                employeeId: attendance.employeeId,
                date: attendance.date,
                tenantId: rlTenantId,
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
              tenant: { connect: { id: rlTenantId } },
              employee: { connect: { id: attendance.employeeId } }
            },
          });
          recordsUpdated++;
        }
        pairsProcessed++;
        if (pairsProcessed % 50 === 0) console.log(`Progress: ${pairsProcessed}/${affectedPairs.size} sessions repaired...`);
      } catch (err) {
        logger.error(`Failed to re-process pair ${pair}:`, err);
      }
    }

    logger.info(`Reprocessing complete. Pairs: ${pairsProcessed}, Records: ${recordsUpdated}`);
    return { pairsProcessed, recordsUpdated };
  } catch (error) {
    logger.error('Historical re-processing failed:', error);
    throw error;
  }
}

// Export for manual execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'sync-names') {
    syncEmployeeNamesFromDeviceUsers()
      .then((result) => {
        console.log(`Name sync complete. Updated: ${result.updated}, Failed: ${result.failed}`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else if (command === 'reprocess') {
    const startDateStr = process.argv[3];
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    reprocessHistoricalLogs(startDate)
      .then((result) => {
        console.log(`Reprocessing complete. Sessions: ${result.pairsProcessed}, Updates: ${result.recordsUpdated}`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else if (command === 'full-sync') {
    console.log('Initiating Full Historical Sync (2020-Present)...');
    startLogSync(true)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    startLogSync()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}

