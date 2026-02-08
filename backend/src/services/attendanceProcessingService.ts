/**
 * Attendance Processing Service - REVAMPED
 * 
 * This service handles all attendance calculations with proper timezone handling.
 * 
 * KEY ASSUMPTIONS (Based on user confirmation):
 * 1. Server runs in IST (Asia/Kolkata)
 * 2. Biometric devices send punch times in IST
 * 3. Night shifts exist and can cross midnight
 * 4. A punch before 5 AM belongs to the PREVIOUS day's shift
 * 
 * STRATEGY:
 * - All punch times are treated as IST (no conversion needed)
 * - Logical date = the "work day" a punch belongs to
 * - For punches between 00:00-05:00, logical date = previous calendar day
 * - Store attendance date as UTC midnight for @db.Date compatibility
 */

import { prisma } from '../config/database';
import logger from '../config/logger';

// Types
interface PunchRecord {
  id?: string;
  userId: string;
  punchTime: Date;
  deviceId?: string;
  punchType?: string;
}

interface AttendanceResult {
  employeeId: string;
  date: Date;           // UTC midnight for @db.Date storage
  firstIn: Date | null;
  lastOut: Date | null;
  workingHours: number;
  totalPunches: number;
  lateArrival: number;
  earlyDeparture: number;
  status: string;
  logs: string;         // JSON array of punch times
  shiftStart: Date | null;
  shiftEnd: Date | null;
}

// Employee cache to avoid repeated lookups
const employeeCache = new Map<string, string>();

/**
 * Get the logical work date for a punch time.
 * 
 * Rules:
 * - Punches from 05:00 to 23:59 belong to THAT calendar day
 * - Punches from 00:00 to 04:59 belong to the PREVIOUS calendar day
 *   (These are late night/early morning punches from night shift workers)
 */
export function getLogicalDate(punchTime: Date): Date {
  // Get hour in local time (server is IST)
  const hour = punchTime.getHours();
  
  // Start with the calendar date of the punch
  const year = punchTime.getFullYear();
  const month = punchTime.getMonth();
  const day = punchTime.getDate();
  
  // If punch is before 5 AM, it belongs to previous day's shift
  if (hour < 5) {
    const previousDay = new Date(year, month, day - 1);
    return new Date(Date.UTC(previousDay.getFullYear(), previousDay.getMonth(), previousDay.getDate()));
  }
  
  // Otherwise, it belongs to the same calendar day
  return new Date(Date.UTC(year, month, day));
}

/**
 * Format a date as YYYY-MM-DD string (IST)
 */
export function formatDateIST(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format time as HH:MM (IST, 24-hour format)
 */
export function formatTimeIST(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Find employee ID from device user ID
 * Checks deviceUserId, employeeCode, and sourceEmployeeId
 */
async function findEmployeeId(deviceUserId: string, tenantId?: string): Promise<string | null> {
  if (!deviceUserId) return null;
  
  const uid = deviceUserId.toString().trim();
  
  // Check cache first
  const cacheKey = tenantId ? `${tenantId}:${uid}` : uid;
  if (employeeCache.has(cacheKey)) {
    return employeeCache.get(cacheKey)!;
  }
  
  // Database lookup
  const whereConditions: any[] = [
    { deviceUserId: uid },
    { employeeCode: uid },
    { sourceEmployeeId: uid }
  ];
  
  // If numeric, try with HO prefix (common pattern)
  if (/^\d+$/.test(uid) && uid.length <= 4) {
    const hoCode = `HO${uid.padStart(3, '0')}`;
    whereConditions.push({ employeeCode: hoCode });
    whereConditions.push({ deviceUserId: hoCode });
  }
  
  const employee = await prisma.employee.findFirst({
    where: {
      ...(tenantId ? { tenantId } : {}),
      OR: whereConditions
    },
    select: { id: true }
  });
  
  if (employee) {
    employeeCache.set(cacheKey, employee.id);
    return employee.id;
  }
  
  return null;
}

/**
 * Process attendance logs for a specific user and date range.
 * Groups punches into work sessions and calculates attendance metrics.
 */
export async function processAttendanceForUser(
  punches: PunchRecord[],
  tenantId?: string
): Promise<AttendanceResult[]> {
  if (!punches || punches.length === 0) return [];
  
  // Group punches by user
  const userPunches = new Map<string, PunchRecord[]>();
  
  for (const punch of punches) {
    const uid = punch.userId;
    if (!userPunches.has(uid)) {
      userPunches.set(uid, []);
    }
    userPunches.get(uid)!.push(punch);
  }
  
  const results: AttendanceResult[] = [];
  
  for (const [userId, userLogs] of userPunches) {
    // Find employee
    const employeeId = await findEmployeeId(userId, tenantId);
    if (!employeeId) {
      logger.debug(`No employee found for userId: ${userId}`);
      continue;
    }
    
    // Sort punches by time
    userLogs.sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());
    
    // Group punches by logical date
    const dateGroups = new Map<string, PunchRecord[]>();
    
    for (const punch of userLogs) {
      const logicalDate = getLogicalDate(punch.punchTime);
      const dateKey = logicalDate.toISOString().split('T')[0];
      
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(punch);
    }
    
    // Process each day
    for (const [dateKey, dayPunches] of dateGroups) {
      // Sort by time
      dayPunches.sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());
      
      const firstIn = dayPunches[0].punchTime;
      const lastOut = dayPunches.length > 1 ? dayPunches[dayPunches.length - 1].punchTime : null;
      
      // Calculate working hours
      let workingHours = 0;
      if (lastOut) {
        workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
      }
      
      // Determine status
      let status = 'Present';
      if (dayPunches.length === 1) {
        status = 'Shift Incomplete';
      } else if (workingHours < 4) {
        status = 'Half Day';
      } else if (workingHours >= 4) {
        status = 'Present';
      }
      
      // Create attendance record
      results.push({
        employeeId,
        date: new Date(dateKey + 'T00:00:00Z'), // UTC midnight for @db.Date
        firstIn,
        lastOut,
        workingHours: Math.round(workingHours * 100) / 100,
        totalPunches: dayPunches.length,
        lateArrival: 0, // Will be calculated with shift data
        earlyDeparture: 0, // Will be calculated with shift data
        status,
        logs: JSON.stringify(dayPunches.map(p => p.punchTime.toISOString())),
        shiftStart: null,
        shiftEnd: null
      });
    }
  }
  
  return results;
}

/**
 * Process attendance from raw device logs for a specific date range.
 * This is the main entry point for attendance calculation.
 */
export async function processAttendanceFromRawLogs(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  employeeId?: string
): Promise<{ processed: number; created: number; updated: number; errors: number }> {
  logger.info(`Processing attendance for tenant ${tenantId} from ${formatDateIST(startDate)} to ${formatDateIST(endDate)}`);
  
  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  try {
    // Build query for raw logs
    // Extend the window to catch night shift punches
    const windowStart = new Date(startDate.getTime() - 12 * 60 * 60 * 1000); // 12 hours before
    const windowEnd = new Date(endDate.getTime() + 36 * 60 * 60 * 1000);    // 36 hours after
    
    const rawLogsWhere: any = {
      tenantId,
      punchTime: {
        gte: windowStart,
        lte: windowEnd
      }
    };
    
    // If specific employee, get their deviceUserId
    if (employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { deviceUserId: true, employeeCode: true }
      });
      
      if (emp) {
        const userIds = [emp.deviceUserId, emp.employeeCode].filter(Boolean);
        if (userIds.length > 0) {
          rawLogsWhere.OR = userIds.map(uid => ({ deviceUserId: uid }));
        }
      }
    }
    
    const rawLogs = await prisma.rawDeviceLog.findMany({
      where: rawLogsWhere,
      orderBy: { punchTime: 'asc' }
    });
    
    logger.info(`Found ${rawLogs.length} raw logs to process`);
    
    if (rawLogs.length === 0) return { processed: 0, created: 0, updated: 0, errors: 0 };
    
    // Convert to PunchRecord format
    const punches: PunchRecord[] = rawLogs.map(log => ({
      id: log.id,
      userId: log.deviceUserId || log.userId || '',
      punchTime: log.punchTime || log.timestamp,
      deviceId: log.deviceId,
      punchType: log.punchType || undefined
    }));
    
    // Process attendance
    const attendanceResults = await processAttendanceForUser(punches, tenantId);
    
    // Filter to only include dates within the requested range
    const filteredResults = attendanceResults.filter(att => {
      const attDate = att.date.getTime();
      const start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())).getTime();
      const end = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())).getTime();
      return attDate >= start && attDate <= end;
    });
    
    // Save to database
    for (const attendance of filteredResults) {
      try {
        const existing = await prisma.attendanceLog.findUnique({
          where: {
            employeeId_date_tenantId: {
              employeeId: attendance.employeeId,
              date: attendance.date,
              tenantId
            }
          }
        });
        
        if (existing) {
          await prisma.attendanceLog.update({
            where: { id: existing.id },
            data: {
              firstIn: attendance.firstIn,
              lastOut: attendance.lastOut,
              workingHours: attendance.workingHours,
              totalPunches: attendance.totalPunches,
              lateArrival: attendance.lateArrival,
              earlyDeparture: attendance.earlyDeparture,
              status: attendance.status,
              logs: attendance.logs
            }
          });
          updated++;
        } else {
          await prisma.attendanceLog.create({
            data: {
              tenantId,
              employeeId: attendance.employeeId,
              date: attendance.date,
              firstIn: attendance.firstIn,
              lastOut: attendance.lastOut,
              workingHours: attendance.workingHours,
              totalPunches: attendance.totalPunches,
              lateArrival: attendance.lateArrival,
              earlyDeparture: attendance.earlyDeparture,
              status: attendance.status,
              logs: attendance.logs
            }
          });
          created++;
        }
        processed++;
      } catch (err) {
        logger.error(`Error saving attendance for employee ${attendance.employeeId}:`, err);
        errors++;
      }
    }
    
    // Mark raw logs as processed
    const processedLogIds = rawLogs.map(l => l.id);
    await prisma.rawDeviceLog.updateMany({
      where: { id: { in: processedLogIds } },
      data: { isProcessed: true, processedAt: new Date() }
    });
    
  } catch (error) {
    logger.error('Error processing attendance from raw logs:', error);
    throw error;
  }
  
  return { processed, created, updated, errors };
}

/**
 * Trigger real-time attendance sync for a single punch.
 * Called when a biometric device pushes a punch in real-time.
 */
export async function triggerRealtimeSync(
  tenantId: string,
  userId: string,
  punchTime: Date
): Promise<void> {
  try {
    // Get the logical date for this punch
    const logicalDate = getLogicalDate(punchTime);
    
    // Create a window to fetch all punches for this day
    // Window: 12 hours before logical date to 36 hours after
    const windowStart = new Date(logicalDate.getTime() - 12 * 60 * 60 * 1000);
    const windowEnd = new Date(logicalDate.getTime() + 36 * 60 * 60 * 1000);
    
    // Fetch all raw logs for this user in this window
    const rawLogs = await prisma.rawDeviceLog.findMany({
      where: {
        tenantId,
        OR: [
          { deviceUserId: userId },
          { userId: userId }
        ],
        punchTime: {
          gte: windowStart,
          lte: windowEnd
        }
      },
      orderBy: { punchTime: 'asc' }
    });
    
    if (rawLogs.length === 0) return;
    
    // Convert to PunchRecord format
    const punches: PunchRecord[] = rawLogs.map(log => ({
      id: log.id,
      userId: log.deviceUserId || log.userId || '',
      punchTime: log.punchTime || log.timestamp,
      deviceId: log.deviceId,
      punchType: log.punchType || undefined
    }));
    
    // Process attendance
    const results = await processAttendanceForUser(punches, tenantId);
    
    // Save results
    for (const attendance of results) {
      await prisma.attendanceLog.upsert({
        where: {
          employeeId_date_tenantId: {
            employeeId: attendance.employeeId,
            date: attendance.date,
            tenantId
          }
        },
        update: {
          firstIn: attendance.firstIn,
          lastOut: attendance.lastOut,
          workingHours: attendance.workingHours,
          totalPunches: attendance.totalPunches,
          lateArrival: attendance.lateArrival,
          earlyDeparture: attendance.earlyDeparture,
          status: attendance.status,
          logs: attendance.logs
        },
        create: {
          tenantId,
          employeeId: attendance.employeeId,
          date: attendance.date,
          firstIn: attendance.firstIn,
          lastOut: attendance.lastOut,
          workingHours: attendance.workingHours,
          totalPunches: attendance.totalPunches,
          lateArrival: attendance.lateArrival,
          earlyDeparture: attendance.earlyDeparture,
          status: attendance.status,
          logs: attendance.logs
        }
      });
    }
    
    // Mark logs as processed
    await prisma.rawDeviceLog.updateMany({
      where: {
        tenantId,
        OR: [
          { deviceUserId: userId },
          { userId: userId }
        ],
        punchTime: {
          gte: windowStart,
          lte: windowEnd
        }
      },
      data: { isProcessed: true, processedAt: new Date() }
    });
    
    logger.debug(`Real-time sync completed for user ${userId} on ${formatDateIST(logicalDate)}`);
    
  } catch (error) {
    logger.error(`Real-time sync failed for user ${userId}:`, error);
  }
}

/**
 * Clear employee cache (call after bulk employee updates)
 */
export function clearEmployeeCache(): void {
  employeeCache.clear();
}

export default {
  getLogicalDate,
  formatDateIST,
  formatTimeIST,
  processAttendanceForUser,
  processAttendanceFromRawLogs,
  triggerRealtimeSync,
  clearEmployeeCache
};
