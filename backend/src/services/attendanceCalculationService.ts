import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Attendance Calculation Service
 * Handles calculation of attendance metrics like working hours, late arrival, etc.
 */

export class AttendanceCalculationService {
    /**
     * Recalculate attendance for a date range
     */
    async recalculateAttendance(tenantId: string, startDate: Date, endDate: Date, employeeIds: string[] = []) {
        console.log(`🔄 Recalculating attendance for ${tenantId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Get employees
        const where: any = {
            tenantId,
            isActive: true
        };

        if (employeeIds && employeeIds.length > 0) {
            where.id = { in: employeeIds };
        }

        const employees = await prisma.employee.findMany({
            where,
            include: {
                shifts: {
                    include: {
                        shift: true
                    }
                }
            }
        });

        console.log(`Found ${employees.length} employees to process`);

        let processedCount = 0;
        let logsCreated = 0;
        let logsUpdated = 0;
        let errorCount = 0;

        for (const employee of employees) {
            try {
                // Get logs for the date range
                const logs = await this.getEmployeeLogs(employee.id, startDate, endDate);

                // Group logs by date
                const logsByDate = this.groupLogsByDate(logs);

                // Process each date
                for (const [dateStr, dateLogs] of Object.entries(logsByDate)) {
                    const date = new Date(dateStr);

                    // Get shift for this date
                    const shift = this.getShiftForDate(employee, date);

                    // Calculate metrics
                    const metrics = this.calculateMetrics(dateLogs as any[], shift, date);

                    // Save attendance log
                    const result = await this.saveAttendanceLog(tenantId, employee.id, date, metrics, dateLogs as any[]);

                    if (result === 'created') logsCreated++;
                    else logsUpdated++;
                }

                processedCount++;
            } catch (error) {
                console.error(`Error processing employee ${employee.id}:`, error);
                errorCount++;
            }
        }

        return {
            processed: processedCount,
            created: logsCreated,
            updated: logsUpdated,
            errors: errorCount
        };
    }

    /**
     * Get raw device logs for an employee
     */
    async getEmployeeLogs(employeeId: string, startDate: Date, endDate: Date) {
        return prisma.deviceLog.findMany({
            where: {
                employeeId,
                punchTime: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                punchTime: 'asc'
            }
        });
    }

    /**
     * Group logs by date (handling overnight shifts)
     */
    groupLogsByDate(logs: any[]) {
        const groups: Record<string, any[]> = {};

        logs.forEach(log => {
            const date = log.punchTime.toISOString().split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(log);
        });

        return groups;
    }

    /**
     * Get shift for specific date
     */
    getShiftForDate(employee: any, date: Date) {
        // Simple logic: return first active shift
        // In reality, this would check roster/schedule
        if (employee.shifts && employee.shifts.length > 0) {
            return employee.shifts[0].shift;
        }
        return null;
    }

    /**
     * Calculate attendance metrics
     */
    calculateMetrics(logs: any[], shift: any, date: Date) {
        // Sort logs by time
        logs.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());

        const firstIn = logs.find(l => l.punchType === 'IN' || l.punchType === '0' || l.punchType === 0)?.punchTime || logs[0]?.punchTime;
        const lastOut = [...logs].reverse().find(l => l.punchType === 'OUT' || l.punchType === '1' || l.punchType === 1)?.punchTime || logs[logs.length - 1]?.punchTime;

        let totalHours = 0;
        let workingHours = 0;
        let lateArrival = 0;
        let earlyDeparture = 0;
        let status = 'Absent';

        if (logs.length > 0) {
            status = 'Present';

            // Calculate total hours (First IN to Last OUT)
            if (firstIn && lastOut) {
                const diff = new Date(lastOut).getTime() - new Date(firstIn).getTime();
                totalHours = diff / (1000 * 60 * 60);
            }

            // Calculate working hours (Sum of IN-OUT pairs)
            workingHours = this.calculateWorkingHours(logs);

            // Shift-based calculations
            if (shift) {
                // Late Arrival
                if (firstIn) {
                    const shiftStart = new Date(date);
                    const [sh, sm] = shift.startTime.split(':');
                    shiftStart.setHours(parseInt(sh), parseInt(sm), 0, 0);

                    // Add slight buffer (grace period)
                    const graceTime = new Date(shiftStart.getTime() + (shift.graceTimeLate || 0) * 60000);

                    if (new Date(firstIn) > graceTime) {
                        lateArrival = (new Date(firstIn).getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
                    }
                }

                // Early Departure
                if (lastOut) {
                    const shiftEnd = new Date(date);
                    const [eh, em] = shift.endTime.split(':');
                    shiftEnd.setHours(parseInt(eh), parseInt(em), 0, 0);

                    // Handle overnight shift
                    if (shift.startTime > shift.endTime) {
                        shiftEnd.setDate(shiftEnd.getDate() + 1);
                    }

                    if (new Date(lastOut) < shiftEnd) {
                        earlyDeparture = (shiftEnd.getTime() - new Date(lastOut).getTime()) / (1000 * 60 * 60);
                    }
                }

                // Status determination based on rules
                if (shift.halfDayThreshold && workingHours < shift.halfDayThreshold) {
                    status = 'Half Day';
                }
            }
        }

        return {
            firstIn,
            lastOut,
            totalHours,
            workingHours,
            lateArrival: Math.max(0, lateArrival),
            earlyDeparture: Math.max(0, earlyDeparture),
            status,
            totalPunches: logs.length
        };
    }

    /**
     * Calculate working hours from IN/OUT pairs
     */
    calculateWorkingHours(logs: any[]) {
        let hours = 0;
        let inTime: number | null = null;

        for (const log of logs) {
            const time = new Date(log.punchTime).getTime();
            const type = String(log.punchType); // Normalize punch type

            if (type === 'IN' || type === '0') {
                if (inTime === null) inTime = time;
            } else if (type === 'OUT' || type === '1') {
                if (inTime !== null) {
                    hours += (time - inTime);
                    inTime = null;
                }
            }
        }

        return hours / (1000 * 60 * 60);
    }

    /**
     * Save attendance log to database
     */
    async saveAttendanceLog(tenantId: string, employeeId: string, date: Date, metrics: any, logs: any[]) {
        const existingLog = await prisma.attendanceLog.findFirst({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lt: new Date(date.setHours(23, 59, 59, 999))
                }
            }
        });

        const logData = {
            tenantId,
            employeeId,
            date: new Date(date),
            firstIn: metrics.firstIn || null,
            lastOut: metrics.lastOut || null,
            totalHours: metrics.totalHours,
            workingHours: metrics.workingHours,
            lateArrival: metrics.lateArrival,
            earlyDeparture: metrics.earlyDeparture,
            status: metrics.status,
            totalPunches: metrics.totalPunches,
            logs: JSON.stringify(logs.map(l => ({
                time: l.punchTime,
                type: l.punchType,
                source: l.source
            })))
        };

        if (existingLog) {
            await prisma.attendanceLog.update({
                where: { id: existingLog.id },
                data: logData
            });
            return 'updated';
        } else {
            await prisma.attendanceLog.create({
                data: logData
            });
            return 'created';
        }
    }
}
