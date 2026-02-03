import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const prisma = new PrismaClient();

export class StudentFieldLogService {
    /**
     * Create a new student field log (e.g. Bus Pickup)
     */
    async createLog(tenantId: string, data: any) {
        if (!data.studentId || !data.type) {
            throw new Error('Student ID and Type are required');
        }

        return prisma.studentFieldLog.create({
            data: {
                tenantId,
                studentId: data.studentId,
                type: data.type,
                location: data.location, // Should be JSON string
                image: data.image,
                remarks: data.remarks,
                routeId: data.routeId || null,
                status: 'PENDING'
            }
        });
    }

    /**
     * Get logs for a specific student
     */
    async getStudentLogs(tenantId: string, studentId: string) {
        return prisma.studentFieldLog.findMany({
            where: { tenantId, studentId },
            include: { route: true },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
    }

    /**
     * Get all pending logs for approval (Admin/Teacher view)
     * For schools, this includes both Student logs and Employee (Teacher) field logs
     */
    async getPendingLogs(tenantId: string) {
        const studentLogs = await prisma.studentFieldLog.findMany({
            where: { tenantId, status: 'PENDING' },
            include: {
                student: {
                    include: { batch: { include: { course: true } } }
                },
                route: true
            },
            orderBy: { timestamp: 'desc' }
        });

        // Also fetch Employee FieldLogs for this tenant
        const employeeLogs = await prisma.fieldLog.findMany({
            where: { tenantId, status: 'pending' },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        // Return a unified but distinguished response
        return {
            students: studentLogs,
            employees: employeeLogs.map(log => ({
                ...log,
                isEmployeeLog: true, // Marker for frontend
                type: log.type === 'IN' ? 'STAFF_IN' : 'STAFF_OUT' // Distinguishable type
            }))
        };
    }

    /**
     * Approve or Reject a log
     * If approved, it optionally updates the StudentAttendance record
     */
    async approveLog(tenantId: string, logId: string, status: string, approvedBy: string, isEmployee: boolean = false) {
        if (isEmployee) {
            const backedStatus = status === 'APPROVED' ? 'approved' : 'rejected';
            const log = await prisma.fieldLog.findUnique({
                where: { id: logId }
            });

            if (!log) throw new Error('Employee Log not found');

            const updated = await prisma.fieldLog.update({
                where: { id: logId },
                data: {
                    status: backedStatus,
                    approvedBy,
                    approvedAt: new Date()
                }
            });

            // If approved, upsert into Teacher's attendance log (standard logic)
            if (backedStatus === 'approved') {
                const punchDate = startOfDay(log.timestamp);

                const existingAtt = await prisma.attendanceLog.findUnique({
                    where: {
                        employeeId_date_tenantId: {
                            employeeId: log.employeeId,
                            date: punchDate,
                            tenantId: tenantId
                        }
                    }
                });

                const updateData: any = {};
                if (log.type === 'IN') {
                    if (!existingAtt || !existingAtt.firstIn || log.timestamp < existingAtt.firstIn) {
                        updateData.firstIn = log.timestamp;
                    }
                } else {
                    if (!existingAtt || !existingAtt.lastOut || log.timestamp > existingAtt.lastOut) {
                        updateData.lastOut = log.timestamp;
                    }
                }

                await prisma.attendanceLog.upsert({
                    where: {
                        employeeId_date_tenantId: {
                            employeeId: log.employeeId,
                            date: punchDate,
                            tenantId: tenantId
                        }
                    },
                    update: updateData,
                    create: {
                        tenantId: tenantId,
                        employeeId: log.employeeId,
                        date: punchDate,
                        firstIn: log.type === 'IN' ? log.timestamp : null,
                        lastOut: log.type === 'OUT' ? log.timestamp : null,
                        status: 'present'
                    }
                });
            }
            return updated;
        }

        const log = await prisma.studentFieldLog.findUnique({
            where: { id: logId },
            include: { student: true }
        });

        if (!log) throw new Error('Log not found');

        const updated = await prisma.studentFieldLog.update({
            where: { id: logId },
            data: {
                status,
                approvedBy,
                approvedAt: new Date()
            }
        });

        // Sync with Daily Attendance (Student) if approved
        if (status === 'APPROVED') {
            const date = startOfDay(log.timestamp);

            await prisma.studentAttendance.upsert({
                where: {
                    studentId_date: {
                        studentId: log.studentId,
                        date
                    }
                },
                update: {
                    status: 'PRESENT',
                    remarks: `Verified via ${log.type} at ${log.timestamp.toLocaleTimeString()}`
                },
                create: {
                    tenantId,
                    studentId: log.studentId,
                    date,
                    status: 'PRESENT',
                    remarks: `Check-in via ${log.type}`
                }
            });
        }

        return updated;
    }
}
