"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLogSync = startLogSync;
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const logger_1 = __importDefault(require("../config/logger"));
async function startLogSync() {
    const syncStartTime = new Date();
    let recordsSynced = 0;
    let status = 'success';
    let message = '';
    try {
        logger_1.default.info('Starting log sync from SQL Server...');
        console.log(`[${new Date().toISOString()}] Starting log sync...`);
        // Get last sync time
        const lastSync = await database_1.prisma.syncStatus.findFirst({
            orderBy: { createdAt: 'desc' },
        });
        const lastSyncTime = lastSync?.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago
        // Get SQL Server connection
        const pool = await (0, database_1.getSqlPool)();
        // Get current date for monthly table calculation
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        // Query DeviceLogs (master table)
        const deviceLogsResult = await pool.request()
            .input('lastSyncTime', mssql_1.default.DateTime, lastSyncTime)
            .query(`
        SELECT DeviceLogId, DeviceId, UserId, LogDate
        FROM DeviceLogs
        WHERE LogDate > @lastSyncTime
        ORDER BY LogDate ASC
      `);
        // Query monthly partitioned table
        const monthlyTableName = `DeviceLogs_${currentMonth}_${currentYear}`;
        let monthlyLogsResult = { recordset: [] };
        try {
            monthlyLogsResult = await pool.request()
                .input('lastSyncTime', mssql_1.default.DateTime, lastSyncTime)
                .query(`
          SELECT DeviceLogId, DeviceId, UserId, LogDate
          FROM ${monthlyTableName}
          WHERE LogDate > @lastSyncTime
          ORDER BY LogDate ASC
        `);
        }
        catch (error) {
            logger_1.default.warn(`Monthly table ${monthlyTableName} may not exist or is not accessible`);
        }
        // Combine and deduplicate logs
        const allLogs = [...deviceLogsResult.recordset, ...monthlyLogsResult.recordset];
        const uniqueLogs = new Map();
        for (const log of allLogs) {
            const key = `${log.UserId}_${log.LogDate.getTime()}`;
            if (!uniqueLogs.has(key)) {
                uniqueLogs.set(key, log);
            }
        }
        logger_1.default.info(`Found ${uniqueLogs.size} new logs to process`);
        console.log(`Found ${uniqueLogs.size} new logs to process`);
        // Store raw device logs
        for (const log of uniqueLogs.values()) {
            try {
                await database_1.prisma.rawDeviceLog.upsert({
                    where: {
                        id: log.DeviceLogId.toString(),
                    },
                    update: {},
                    create: {
                        id: log.DeviceLogId.toString(),
                        deviceId: log.DeviceId.toString(),
                        userId: log.UserId.toString(),
                        punchTime: log.LogDate,
                    },
                });
            }
            catch (error) {
                logger_1.default.warn(`Failed to store raw log ${log.DeviceLogId}:`, error);
            }
        }
        // Process attendance by grouping punches by employee and date
        const processedAttendance = await processAttendanceLogs(Array.from(uniqueLogs.values()));
        // Save processed attendance
        for (const attendance of processedAttendance) {
            try {
                await database_1.prisma.attendanceLog.upsert({
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
            catch (error) {
                logger_1.default.error(`Failed to save attendance for ${attendance.employeeId}:`, error);
            }
        }
        // Mark raw logs as processed
        for (const log of uniqueLogs.values()) {
            await database_1.prisma.rawDeviceLog.update({
                where: { id: log.DeviceLogId.toString() },
                data: { isProcessed: true },
            });
        }
        message = `Successfully synced ${recordsSynced} attendance records`;
        logger_1.default.info(message);
        console.log(`[${new Date().toISOString()}] ${message}`);
    }
    catch (error) {
        status = 'failed';
        message = error instanceof Error ? error.message : 'Unknown error';
        logger_1.default.error('Log sync failed:', error);
        console.error(`[${new Date().toISOString()}] Log sync failed:`, message);
    }
    finally {
        // Record sync status
        await database_1.prisma.syncStatus.create({
            data: {
                lastSyncTime: syncStartTime,
                recordsSynced,
                status,
                message,
            },
        });
    }
}
async function processAttendanceLogs(logs) {
    // Group logs by employee device user ID
    const employeeLogs = new Map();
    for (const log of logs) {
        const key = log.UserId.toString();
        if (!employeeLogs.has(key)) {
            employeeLogs.set(key, []);
        }
        employeeLogs.get(key).push(log);
    }
    const processedResults = [];
    for (const [deviceUserId, userLogs] of employeeLogs) {
        // Find employee by device user ID
        const employee = await database_1.prisma.employee.findFirst({
            where: { deviceUserId },
            include: { shift: true },
        });
        if (!employee) {
            logger_1.default.warn(`No employee found for device user ID: ${deviceUserId}`);
            continue;
        }
        // Group logs by date
        const logsByDate = new Map();
        for (const log of userLogs) {
            const dateKey = log.LogDate.toISOString().split('T')[0];
            if (!logsByDate.has(dateKey)) {
                logsByDate.set(dateKey, []);
            }
            logsByDate.get(dateKey).push(log);
        }
        // Process each date
        for (const [dateKey, dateLogs] of logsByDate) {
            // Sort logs by time
            dateLogs.sort((a, b) => a.LogDate.getTime() - b.LogDate.getTime());
            const firstIn = dateLogs[0].LogDate;
            const lastOut = dateLogs[dateLogs.length - 1].LogDate;
            // Calculate working hours
            let workingHours = null;
            if (firstIn && lastOut && firstIn.getTime() !== lastOut.getTime()) {
                const diffMs = lastOut.getTime() - firstIn.getTime();
                workingHours = diffMs / (1000 * 60 * 60);
            }
            // Calculate shift times and late/early indicators
            let shiftStart = null;
            let shiftEnd = null;
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
//# sourceMappingURL=logSyncService.js.map