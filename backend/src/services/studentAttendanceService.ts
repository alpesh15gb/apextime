import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export class StudentAttendanceService {

    /**
     * Process logic: 
     * Reads DeviceLog -> Matches Student.biometricId -> Creates StudentAttendance
     */
    async processDailyAttendance(tenantId: string, dateString: string) {
        const date = new Date(dateString);
        const start = startOfDay(date);
        const end = endOfDay(date);

        // 1. Fetch Logs for the day (Optimized: Get unique UserIDs involved)
        const logs = await prisma.deviceLog.findMany({
            where: {
                tenantId,
                punchTime: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { punchTime: 'asc' }
        });

        // 2. Fetch Active Students with Biometric IDs
        const students = await prisma.student.findMany({
            where: {
                tenantId,
                status: 'ACTIVE',
                biometricId: { not: null }
            }
        });

        const results = {
            processed: 0,
            present: 0,
            absent: 0
        };

        // 3. Process each student
        for (const student of students) {
            if (!student.biometricId) continue;

            const studentLogs = logs.filter(l => l.deviceUserId === student.biometricId);

            let status = 'ABSENT';
            let remarks = '';

            if (studentLogs.length > 0) {
                status = 'PRESENT';
                const firstPunch = studentLogs[0].punchTime;
                const lastPunch = studentLogs[studentLogs.length - 1].punchTime;

                // Simple remarks for now: "In: 08:00, Out: 14:00"
                const inTime = firstPunch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                const outTime = lastPunch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

                if (studentLogs.length > 1) {
                    remarks = `In: ${inTime}, Out: ${outTime}`;
                } else {
                    remarks = `In: ${inTime}`;
                }
            }

            // Upsert Attendance Record
            await prisma.studentAttendance.upsert({
                where: {
                    studentId_date: {
                        studentId: student.id,
                        date: start // Normalize to midnight for unique constraint
                    }
                },
                update: {
                    status,
                    remarks,
                    updatedAt: new Date()
                },
                create: {
                    studentId: student.id,
                    date: start,
                    status,
                    remarks
                }
            });

            results.processed++;
            if (status === 'PRESENT') results.present++;
            else results.absent++;
        }

        return results;
    }

    /**
     * Get Attendance Stats for a Date
     */
    async getDailyStats(tenantId: string, dateString: string) {
        const date = new Date(dateString);
        const start = startOfDay(date);

        const attendance = await prisma.studentAttendance.findMany({
            where: {
                student: { tenantId },
                date: start
            },
            include: {
                student: {
                    include: { batch: { include: { course: true } } }
                }
            }
        });

        return attendance;
    }

    /**
     * Manually Update Attendance
     */
    async updateAttendance(id: string, status: string, remarks?: string) {
        return prisma.studentAttendance.update({
            where: { id },
            data: { status, remarks }
        });
    }
}
