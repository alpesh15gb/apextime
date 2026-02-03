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
     */
    async getPendingLogs(tenantId: string) {
        return prisma.studentFieldLog.findMany({
            where: { tenantId, status: 'PENDING' },
            include: {
                student: {
                    include: { batch: { include: { course: true } } }
                },
                route: true
            },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Approve or Reject a log
     * If approved, it optionally updates the StudentAttendance record
     */
    async approveLog(tenantId: string, logId: string, status: string, approvedBy: string) {
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

        // Sync with Daily Attendance if approved
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
