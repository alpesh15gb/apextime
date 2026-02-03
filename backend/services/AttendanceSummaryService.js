const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Attendance Summary Service
 * Generates monthly/period-wise summary reports
 */

class AttendanceSummaryService {
    /**
     * Generate summary report for a period
     * @param {string} tenantId - Tenant ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} groupBy - Group by field (department, designation, etc.)
     */
    async generateSummary(tenantId, startDate, endDate, groupBy = null) {
        console.log(`📊 Generating attendance summary for ${tenantId}`);
        console.log(`📅 Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        // Get all attendance logs for the period
        const logs = await prisma.attendanceLog.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        designation: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        // Group logs by employee
        const employeeMap = new Map();

        for (const log of logs) {
            const empId = log.employee.id;

            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    employeeId: empId,
                    employeeCode: log.employee.employeeCode,
                    employeeName: `${log.employee.firstName} ${log.employee.lastName}`,
                    department: log.employee.department?.name || '-',
                    departmentId: log.employee.department?.id,
                    designation: log.employee.designation?.name || '-',
                    designationId: log.employee.designation?.id,
                    totalDays: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    halfDay: 0,
                    totalHours: 0,
                    totalWorkingHours: 0,
                    totalLateMinutes: 0,
                    totalEarlyMinutes: 0,
                    logs: []
                });
            }

            const empData = employeeMap.get(empId);
            empData.totalDays++;
            empData.totalHours += log.totalHours || 0;
            empData.totalWorkingHours += log.workingHours || 0;
            empData.totalLateMinutes += Math.round((log.lateArrival || 0) * 60);
            empData.totalEarlyMinutes += Math.round((log.earlyDeparture || 0) * 60);

            // Count status
            switch (log.status) {
                case 'Present':
                    empData.present++;
                    break;
                case 'Absent':
                    empData.absent++;
                    break;
                case 'Late':
                    empData.late++;
                    break;
                case 'Half Day':
                    empData.halfDay++;
                    break;
            }

            empData.logs.push({
                date: log.date,
                status: log.status,
                firstIn: log.firstIn,
                lastOut: log.lastOut,
                totalHours: log.totalHours
            });
        });

        // Convert map to array and calculate averages
        const summary = Array.from(employeeMap.values()).map(emp => ({
            ...emp,
            avgHours: emp.totalDays > 0 ? emp.totalHours / emp.totalDays : 0,
            avgWorkingHours: emp.totalDays > 0 ? emp.totalWorkingHours / emp.totalDays : 0,
            attendancePercentage: emp.totalDays > 0 ? (emp.present / emp.totalDays) * 100 : 0
        }));

        // Group by if specified
        if (groupBy) {
            return this.groupSummary(summary, groupBy);
        }

        return summary;
    }

    /**
     * Group summary by specified field
     */
    groupSummary(summary, groupBy) {
        const grouped = new Map();

        for (const emp of summary) {
            let groupKey;
            let groupName;

            switch (groupBy) {
                case 'department':
                    groupKey = emp.departmentId || 'no-department';
                    groupName = emp.department;
                    break;
                case 'designation':
                    groupKey = emp.designationId || 'no-designation';
                    groupName = emp.designation;
                    break;
                default:
                    groupKey = 'all';
                    groupName = 'All Employees';
            }

            if (!grouped.has(groupKey)) {
                grouped.set(groupKey, {
                    groupName,
                    employees: [],
                    totalEmployees: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalLate: 0,
                    totalHalfDay: 0,
                    avgAttendancePercentage: 0
                });
            }

            const group = grouped.get(groupKey);
            group.employees.push(emp);
            group.totalEmployees++;
            group.totalPresent += emp.present;
            group.totalAbsent += emp.absent;
            group.totalLate += emp.late;
            group.totalHalfDay += emp.halfDay;
        });

        // Calculate group averages
        for (const group of grouped.values()) {
            const totalAttendancePercentage = group.employees.reduce(
                (sum, emp) => sum + emp.attendancePercentage,
                0
            );
            group.avgAttendancePercentage = totalAttendancePercentage / group.totalEmployees;
        }

        return Array.from(grouped.values());
    }

    /**
     * Generate monthly summary for all employees
     */
    async generateMonthlySummary(tenantId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month

        return this.generateSummary(tenantId, startDate, endDate);
    }

    /**
     * Get employee-wise daily breakdown
     */
    async getEmployeeDailyBreakdown(tenantId, employeeId, startDate, endDate) {
        const logs = await prisma.attendanceLog.findMany({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        return logs.map(log => ({
            date: log.date,
            status: log.status,
            firstIn: log.firstIn,
            lastOut: log.lastOut,
            totalHours: log.totalHours,
            workingHours: log.workingHours,
            lateArrival: log.lateArrival,
            earlyDeparture: log.earlyDeparture,
            punches: log.logs ? JSON.parse(log.logs) : []
        }));
    }

    /**
     * Get department-wise summary
     */
    async getDepartmentSummary(tenantId, startDate, endDate) {
        return this.generateSummary(tenantId, startDate, endDate, 'department');
    }

    /**
     * Calculate LOP (Loss of Pay) days
     */
    calculateLOP(summary, workingDaysInMonth) {
        return summary.map(emp => ({
            ...emp,
            expectedDays: workingDaysInMonth,
            lopDays: Math.max(0, workingDaysInMonth - emp.present - emp.halfDay * 0.5)
        }));
    }
}

module.exports = AttendanceSummaryService;
