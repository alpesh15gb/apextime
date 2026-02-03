const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Robust Attendance Calculation Service
 * Calculates attendance metrics from raw punch logs
 * Supports: First IN, Last OUT, Total Hours, Working Hours, Late Arrival, Early Departure, OT
 */

class AttendanceCalculationService {
    /**
     * Recalculate attendance for a date range
     * @param {string} tenantId - Tenant ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string[]} employeeIds - Optional array of employee IDs to recalculate
     */
    async recalculateAttendance(tenantId, startDate, endDate, employeeIds = null) {
        console.log(`🔄 Recalculating attendance for ${tenantId}`);
        console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        // Get all employees for this tenant
        const employeeFilter = {
            tenantId,
            isActive: true
        };

        if (employeeIds && employeeIds.length > 0) {
            employeeFilter.id = { in: employeeIds };
        }

        const employees = await prisma.employee.findMany({
            where: employeeFilter,
            include: {
                shift: true,
                department: true
            }
        });

        console.log(`👥 Processing ${employees.length} employees\n`);

        let processed = 0;
        let created = 0;
        let updated = 0;
        let errors = 0;

        // Process each employee
        for (const employee of employees) {
            try {
                // Get all device logs for this employee in the date range
                const logs = await this.getEmployeeLogs(employee.id, startDate, endDate);

                if (logs.length === 0) {
                    continue;
                }

                // Group logs by date
                const logsByDate = this.groupLogsByDate(logs);

                // Process each date
                for (const [dateStr, dateLogs] of Object.entries(logsByDate)) {
                    const date = new Date(dateStr + 'T00:00:00.000Z');

                    // Calculate attendance metrics
                    const metrics = this.calculateMetrics(dateLogs, employee.shift, date);

                    // Check if attendance log already exists
                    const existing = await prisma.attendanceLog.findFirst({
                        where: {
                            employeeId: employee.id,
                            date: date,
                            tenantId: tenantId
                        }
                    });

                    if (existing) {
                        // Update existing log
                        await prisma.attendanceLog.update({
                            where: { id: existing.id },
                            data: {
                                firstIn: metrics.firstIn,
                                lastOut: metrics.lastOut,
                                totalHours: metrics.totalHours,
                                workingHours: metrics.workingHours,
                                lateArrival: metrics.lateArrival,
                                earlyDeparture: metrics.earlyDeparture,
                                status: metrics.status,
                                logs: JSON.stringify(metrics.allPunches),
                                totalPunches: metrics.totalPunches,
                                shiftStart: metrics.shiftStart,
                                shiftEnd: metrics.shiftEnd,
                                rawData: `Recalculated - ${metrics.totalPunches} punches`
                            }
                        });
                        updated++;
                    } else {
                        // Create new log
                        await prisma.attendanceLog.create({
                            data: {
                                employeeId: employee.id,
                                tenantId: tenantId,
                                date: date,
                                firstIn: metrics.firstIn,
                                lastOut: metrics.lastOut,
                                totalHours: metrics.totalHours,
                                workingHours: metrics.workingHours,
                                lateArrival: metrics.lateArrival,
                                earlyDeparture: metrics.earlyDeparture,
                                status: metrics.status,
                                logs: JSON.stringify(metrics.allPunches),
                                totalPunches: metrics.totalPunches,
                                shiftStart: metrics.shiftStart,
                                shiftEnd: metrics.shiftEnd,
                                rawData: `Calculated - ${metrics.totalPunches} punches`
                            }
                        });
                        created++;
                    }
                }

                processed++;
                if (processed % 10 === 0) {
                    console.log(`   Processed ${processed}/${employees.length} employees...`);
                }
            } catch (error) {
                console.error(`❌ Error processing employee ${employee.employeeCode}:`, error.message);
                errors++;
            }
        }

        console.log('\n✅ Recalculation Complete!');
        console.log(`📊 Summary:`);
        console.log(`   Employees Processed: ${processed}`);
        console.log(`   Logs Created: ${created}`);
        console.log(`   Logs Updated: ${updated}`);
        console.log(`   Errors: ${errors}`);

        return { processed, created, updated, errors };
    }

    /**
     * Get employee device logs for date range
     */
    async getEmployeeLogs(employeeId, startDate, endDate) {
        // Get from DeviceLog table
        const deviceLogs = await prisma.deviceLog.findMany({
            where: {
                employeeId: employeeId,
                punchTime: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                punchTime: 'asc'
            }
        });

        return deviceLogs;
    }

    /**
     * Group logs by date
     */
    groupLogsByDate(logs) {
        const grouped = {};

        for (const log of logs) {
            const dateStr = log.punchTime.toISOString().split('T')[0];

            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }

            grouped[dateStr].push(log);
        }

        return grouped;
    }

    /**
     * Calculate attendance metrics for a day
     */
    calculateMetrics(logs, shift, date) {
        // Sort logs by time
        logs.sort((a, b) => a.punchTime - b.punchTime);

        // Find first IN and last OUT
        const firstInLog = logs.find(l => l.punchType === 'IN');
        const lastOutLog = logs.slice().reverse().find(l => l.punchType === 'OUT');

        const firstIn = firstInLog ? firstInLog.punchTime : logs[0]?.punchTime;
        const lastOut = lastOutLog ? lastOutLog.punchTime : logs[logs.length - 1]?.punchTime;

        // Calculate total hours
        const totalHours = firstIn && lastOut
            ? (lastOut - firstIn) / (1000 * 60 * 60)
            : 0;

        // Calculate working hours (sum of IN-OUT pairs)
        const workingHours = this.calculateWorkingHours(logs);

        // Get shift times
        let shiftStart = null;
        let shiftEnd = null;
        let lateArrival = 0;
        let earlyDeparture = 0;

        if (shift) {
            // Construct shift start/end times for this date
            const shiftStartTime = shift.startTime; // Format: "09:00:00"
            const shiftEndTime = shift.endTime;

            if (shiftStartTime) {
                const [hours, minutes] = shiftStartTime.split(':');
                shiftStart = new Date(date);
                shiftStart.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
            }

            if (shiftEndTime) {
                const [hours, minutes] = shiftEndTime.split(':');
                shiftEnd = new Date(date);
                shiftEnd.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

                // Handle overnight shifts
                if (shiftEnd < shiftStart) {
                    shiftEnd.setDate(shiftEnd.getDate() + 1);
                }
            }

            // Calculate late arrival
            if (firstIn && shiftStart && firstIn > shiftStart) {
                lateArrival = (firstIn - shiftStart) / (1000 * 60 * 60);
            }

            // Calculate early departure
            if (lastOut && shiftEnd && lastOut < shiftEnd) {
                earlyDeparture = (shiftEnd - lastOut) / (1000 * 60 * 60);
            }
        }

        // Determine status
        let status = 'Present';
        if (!firstIn) {
            status = 'Absent';
        } else if (lateArrival > 0.5) { // More than 30 minutes late
            status = 'Late';
        } else if (totalHours < 4) {
            status = 'Half Day';
        }

        // Prepare all punches for JSON storage
        const allPunches = logs.map(log => ({
            time: log.punchTime.toISOString(),
            type: log.punchType,
            source: log.source || 'DEVICE',
            deviceId: log.deviceId
        }));

        return {
            firstIn,
            lastOut,
            totalHours: parseFloat(totalHours.toFixed(2)),
            workingHours: parseFloat(workingHours.toFixed(2)),
            lateArrival: parseFloat(lateArrival.toFixed(2)),
            earlyDeparture: parseFloat(earlyDeparture.toFixed(2)),
            status,
            allPunches,
            totalPunches: logs.length,
            shiftStart,
            shiftEnd
        };
    }

    /**
     * Calculate actual working hours (sum of IN-OUT pairs)
     */
    calculateWorkingHours(logs) {
        let totalMinutes = 0;
        let lastIn = null;

        for (const log of logs) {
            if (log.punchType === 'IN') {
                lastIn = log.punchTime;
            } else if (log.punchType === 'OUT' && lastIn) {
                const duration = (log.punchTime - lastIn) / (1000 * 60);
                totalMinutes += duration;
                lastIn = null;
            }
        }

        return totalMinutes / 60;
    }

    /**
     * Calculate overtime
     */
    calculateOvertime(lastOut, shiftEnd) {
        if (!lastOut || !shiftEnd || lastOut <= shiftEnd) {
            return 0;
        }

        return (lastOut - shiftEnd) / (1000 * 60 * 60);
    }
}

module.exports = AttendanceCalculationService;
