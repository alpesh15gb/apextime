import { getSqlPool, prisma } from '../config/database';
import sql from 'mssql';
import logger from '../config/logger';
import { normalizeName, parseEmployeeName } from '../utils/nameUtils';

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

// Cache for created employees to avoid repeated lookups
const employeeCache = new Map<string, string>(); // deviceUserId -> employeeId

export async function startLogSync(fullSync: boolean = false): Promise<void> {
  const syncStartTime = new Date();
  let recordsSynced = 0;
  let employeesCreated = 0;
  let status = 'success';
  let message = '';

  try {
    logger.info(`Starting log sync from SQL Server... (fullSync: ${fullSync})`);
    console.log(`[${new Date().toISOString()}] Starting log sync... (fullSync: ${fullSync})`);

    // Get last sync time
    let lastSyncTime: Date;

    if (fullSync) {
      // Full sync: go back to 2020-01-01 to capture all historical data
      lastSyncTime = new Date('2020-01-01');
      logger.info('Full sync mode: processing all historical data from 2020-01-01');
    } else {
      const lastSync = await prisma.syncStatus.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      lastSyncTime = lastSync?.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get SQL Server connection
    const pool = await getSqlPool();

    // Discover all DeviceLogs tables
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME LIKE 'DeviceLogs%'
      ORDER BY TABLE_NAME
    `);

    const tablesToTry = tablesResult.recordset.map((row: any) => row.TABLE_NAME);
    logger.info(`Found ${tablesToTry.length} DeviceLogs tables to query`);

    // Try to get logs from all discovered tables
    let allLogs: RawLog[] = [];

    for (const tableName of tablesToTry) {
      try {
        logger.info(`Querying table: ${tableName}`);
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
      // Pre-fetch all existing employees with deviceUserId or sourceEmployeeId
      const existingEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { deviceUserId: { not: null } },
            { sourceEmployeeId: { not: null } }
          ]
        },
        select: { id: true, deviceUserId: true, sourceEmployeeId: true }
      });

      for (const emp of existingEmployees) {
        if (emp.sourceEmployeeId) {
          // Use sourceEmployeeId as primary cache key if available
          employeeCache.set(`SID:${emp.sourceEmployeeId}`, emp.id);
        }
        if (emp.deviceUserId) {
          employeeCache.set(emp.deviceUserId, emp.id);
        }
      }
      logger.info(`Loaded ${employeeCache.size} employees into cache`);

      // Store raw device logs (with error handling for each)
      let storedCount = 0;
      for (const log of uniqueLogs.values()) {
        try {
          await prisma.rawDeviceLog.upsert({
            where: {
              id: log.DeviceLogId.toString(),
            },
            update: {},
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

      // Load device user info from SQL Server once at start
      await loadDeviceUserInfoFromSqlServer();
      logger.info(`Loaded ${deviceUserInfoCache.size} device users into cache for deduplication`);

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
                continue;
              }
            }

            // Fallback: Check if this userId maps to a name that already exists in another employee
            let effectiveName = userInfo?.Name;

            // Try to resolve proper name if it's currently numeric
            if (!effectiveName || /^\d+$/.test(effectiveName.trim())) {
              const properName = await lookupProperEmployeeName(userId);
              if (properName) effectiveName = properName;
            }

            if (effectiveName && !/^\d+$/.test(effectiveName.trim())) {
              const normalizedSearch = normalizeName(effectiveName);

              // Find all employees and check normalized names
              const allEmps = await prisma.employee.findMany({
                select: { id: true, firstName: true, lastName: true, employeeCode: true, deviceUserId: true }
              });

              const existingByName = allEmps.find(e => normalizeName(e.firstName, e.lastName) === normalizedSearch);

              if (existingByName) {
                // Link this userId to the existing employee
                logger.info(`Found existing employee ${existingByName.employeeCode} by fuzzy name match "${effectiveName}" for userId ${userId}. Linking...`);

                // If the existing employee doesn't have a deviceUserId yet, or it's the numeric version of this one
                if (!existingByName.deviceUserId || /^\d+$/.test(existingByName.deviceUserId)) {
                  await prisma.employee.update({
                    where: { id: existingByName.id },
                    data: { deviceUserId: userId.toString() }
                  });
                }

                employeeCache.set(userId, existingByName.id);
                continue;
              }
            }

            const newEmployee = await createEmployeeFromDeviceLog(userId);
            if (newEmployee) {
              employeeCache.set(userId, newEmployee.id);
              employeesCreated++;
            }
          } catch (error) {
            logger.error(`Failed to create/link employee for userId ${userId}:`, error);
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
        const dateStr = log.LogDate.toISOString().split('T')[0];
        affectedPairs.add(`${log.UserId}|${dateStr}`);
      }

      logger.info(`Processing attendance for ${affectedPairs.size} employee-day pairs...`);

      for (const pair of affectedPairs) {
        try {
          const [uId, dStr] = pair.split('|');
          const targetDate = new Date(dStr);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);

          // Get ALL raw logs for this user on this day from database (including previous syncs)
          const allRawLogsMatch = await prisma.rawDeviceLog.findMany({
            where: {
              userId: uId,
              punchTime: {
                gte: targetDate,
                lt: nextDay
              }
            },
            orderBy: { punchTime: 'asc' }
          });

          if (allRawLogsMatch.length === 0) continue;

          // Convert to RawLog format for processor
          const formattedLogs: RawLog[] = allRawLogsMatch.map(rl => ({
            DeviceLogId: parseInt(rl.id),
            DeviceId: parseInt(rl.deviceId),
            UserId: rl.userId,
            LogDate: rl.punchTime
          }));

          // Process this specific day for this specific employee
          const processingResults = await processAttendanceLogs(formattedLogs);

          for (const attendance of processingResults) {
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
            await prisma.rawDeviceLog.updateMany({
              where: { id: log.DeviceLogId.toString() },
              data: { isProcessed: true },
            });
            markedCount++;
          }
        } catch (error) {
          logger.warn(`Failed to mark log ${log.DeviceLogId} as processed:`, error);
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
    await prisma.syncStatus.create({
      data: {
        lastSyncTime: syncStartTime,
        recordsSynced,
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

async function loadDeviceUserInfoFromSqlServer(): Promise<void> {
  try {
    const pool = await getSqlPool();

    // Query ALL employees with EmployeeCodeInDevice (not just DeviceUsers)
    // This ensures we get names for employees on all devices (HO, KSDK, MIPA, etc.)
    const result = await pool.request().query(`
      SELECT
        e.EmployeeCodeInDevice as UserId,
        e.EmployeeId,
        e.EmployeeName,
        e.Designation,
        e.DepartmentId,
        d.DepartmentFName as DepartmentName,
        du.DeviceId
      FROM Employees e
      LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
      LEFT JOIN DeviceUsers du ON e.EmployeeId = du.EmployeeId
      WHERE e.EmployeeCodeInDevice IS NOT NULL
        AND e.EmployeeCodeInDevice <> ''
        AND e.Status = 'Working'
    `);

    for (const user of result.recordset) {
      // Use EmployeeCodeInDevice as the key - convert to string to match app's deviceUserId
      const deviceUserIdStr = user.UserId?.toString();

      // Skip if this deviceUserId is already cached and the new name is just a number
      // This prioritizes records with actual names (e.g., "A Lakshman Rao") over placeholder names (e.g., "37")
      const existingEntry = deviceUserInfoCache.get(deviceUserIdStr);
      const newName = user.EmployeeName || `User ${deviceUserIdStr}`;
      const isNewNameJustNumber = /^\d+$/.test(newName.trim());
      const isExistingNameJustNumber = existingEntry ? /^\d+$/.test(existingEntry.Name.trim()) : true;

      if (existingEntry && !isExistingNameJustNumber && isNewNameJustNumber) {
        // Keep the existing entry with proper name, skip this numeric one
        continue;
      }

      deviceUserInfoCache.set(deviceUserIdStr, {
        UserId: deviceUserIdStr,
        Name: newName,
        DeviceId: user.DeviceId,
        EmployeeId: user.EmployeeId?.toString(),
        Designation: user.Designation,
        DepartmentId: user.DepartmentId?.toString(),
        DepartmentName: user.DepartmentName,
      });
    }

    logger.info(`Loaded ${deviceUserInfoCache.size} device users from SQL Server`);
  } catch (error) {
    logger.error('Failed to load device user info from SQL Server:', error);
  }
}

// Utility removed as it's now in src/utils/nameUtils.ts

async function getOrCreateDepartment(departmentName: string): Promise<string | null> {
  if (!departmentName || departmentName.trim() === '') {
    return null;
  }

  const deptCode = departmentName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

  try {
    // Try to find existing department by code (using findFirst since code+branchId is unique)
    const existing = await prisma.department.findFirst({
      where: { code: deptCode }
    });

    if (existing) {
      return existing.id;
    }

    // Create new department
    const newDept = await prisma.department.create({
      data: {
        name: departmentName,
        code: deptCode,
        isActive: true,
      }
    });

    logger.info(`Created new department: ${departmentName} (${deptCode})`);
    return newDept.id;
  } catch (error) {
    logger.error(`Failed to create department ${departmentName}:`, error);
    return null;
  }
}

async function getOrCreateDesignation(designationName: string): Promise<string | null> {
  if (!designationName || designationName.trim() === '') {
    return null;
  }

  const desigCode = designationName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);

  try {
    // Try to find existing designation
    const existing = await prisma.designation.findUnique({
      where: { code: desigCode }
    });

    if (existing) {
      return existing.id;
    }

    // Create new designation
    const newDesig = await prisma.designation.create({
      data: {
        name: designationName,
        code: desigCode,
        isActive: true,
      }
    });

    logger.info(`Created new designation: ${designationName} (${desigCode})`);
    return newDesig.id;
  } catch (error) {
    logger.error(`Failed to create designation ${designationName}:`, error);
    return null;
  }
}

async function lookupProperEmployeeName(deviceUserId: string): Promise<string | null> {
  // If deviceUserId is numeric, try to find the HO-prefixed version
  if (/^\d+$/.test(deviceUserId)) {
    const hoCode = `HO${deviceUserId.padStart(3, '0')}`;
    const hoInfo = deviceUserInfoCache.get(hoCode);
    if (hoInfo?.Name && !/^\d+$/.test(hoInfo.Name.trim())) {
      return hoInfo.Name;
    }
  }
  return null;
}

async function createEmployeeFromDeviceLog(deviceUserId: string) {
  try {
    // Load device user info if cache is empty
    if (deviceUserInfoCache.size === 0) {
      await loadDeviceUserInfoFromSqlServer();
    }

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
    const employeeCode = `EMP${deviceUserId.toString().padStart(4, '0')}`;

    // Get or create department and designation
    let departmentId: string | null = null;
    let designationId: string | null = null;

    if (userInfo?.DepartmentName) {
      departmentId = await getOrCreateDepartment(userInfo.DepartmentName);
    }

    if (userInfo?.Designation) {
      designationId = await getOrCreateDesignation(userInfo.Designation);
    }

    // Check if employee code already exists
    const existing = await prisma.employee.findUnique({
      where: { employeeCode }
    });

    if (existing) {
      // Update existing employee with deviceUserId, name, department, designation
      const updateData: any = {
        deviceUserId: deviceUserId.toString(),
        sourceEmployeeId: userInfo?.EmployeeId?.toString() // Ensure sourceId is stored
      };

      if (effectiveName && (existing.firstName === `Employee` || existing.lastName === deviceUserId || /^\d+$/.test(existing.firstName))) {
        // Update name if it was auto-generated or is just a number
        const { firstName, lastName } = parseEmployeeName(effectiveName);
        updateData.firstName = firstName;
        updateData.lastName = lastName;
        logger.info(`Updating employee ${employeeCode} name to: ${firstName} ${lastName}`);
      }

      // Update department if not set
      if (departmentId && !existing.departmentId) {
        updateData.departmentId = departmentId;
      }

      // Update designation if not set
      if (designationId && !existing.designationId) {
        updateData.designationId = designationId;
      }

      return await prisma.employee.update({
        where: { id: existing.id },
        data: updateData
      });
    }

    // Parse name from SQL Server or use default
    let firstName = 'Employee';
    let lastName = deviceUserId;

    if (effectiveName) {
      const parsed = parseEmployeeName(effectiveName);
      firstName = parsed.firstName;
      lastName = parsed.lastName;
      logger.info(`Creating employee ${employeeCode} with name from SQL Server: ${firstName} ${lastName}`);
    } else {
      logger.info(`Creating employee ${employeeCode} with default name (UserId: ${deviceUserId})`);
    }

    // Create new employee with department and designation
    const employee = await prisma.employee.create({
      data: {
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
    // Get employee from cache
    const employeeId = employeeCache.get(deviceUserId);

    if (!employeeId) {
      logger.warn(`No employee found for device user ID: ${deviceUserId}`);
      continue;
    }

    // Get full employee details including shift
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (!employee) {
      logger.warn(`Employee not found in database for ID: ${employeeId}`);
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
      // If only one punch exists, lastOut should be null to avoid 0-duration confusion
      const lastOut = dateLogs.length > 1 ? dateLogs[dateLogs.length - 1].LogDate : null;

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

// Sync employee names, designation and department from SQL Server
export async function syncEmployeeNamesFromDeviceUsers(): Promise<{ updated: number; failed: number; deptUpdated: number; desigUpdated: number }> {
  try {
    logger.info('Starting employee name, department and designation sync from SQL Server...');

    // Load device user info
    await loadDeviceUserInfoFromSqlServer();

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
        departmentId = await getOrCreateDepartment(userInfo.DepartmentName);
      }

      if (userInfo?.Designation && !employee.designationId) {
        designationId = await getOrCreateDesignation(userInfo.Designation);
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
  } else {
    startLogSync()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}
