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
        // Ensure we only process logs from STUDENT devices
        // @ts-ignore
        const rawLogs = await prisma.rawDeviceLog.findMany({
            where: {
                tenantId,
                punchTime: {
                    gte: start,
                    lte: end
                },
                device: {
                    // Primitive check: We'll filter in JS as JSON filtering is complex
                }
            },
            include: { device: true },
            orderBy: { punchTime: 'asc' }
        });

        const logs = rawLogs.filter((l: any) => {
            if (!l.device?.config) return false;
            try {
                const cfg = JSON.parse(l.device.config);
                return (cfg.type || '').toUpperCase() === 'STUDENT';
            } catch { return false; }
        }).map((l: any) => ({
            ...l,
            punchTime: l.punchTime || l.timestamp
        }));

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
                    tenantId,
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

        // Fetch all active students
        const students = await prisma.student.findMany({
            where: { tenantId, status: 'ACTIVE' },
            include: { batch: { include: { course: true } } },
            orderBy: { firstName: 'asc' }
        });

        // Fetch existing attendance records
        const attendance = await prisma.studentAttendance.findMany({
            where: { tenantId, date: start }
        });

        const attendanceMap = new Map(attendance.map(a => [a.studentId, a]));

        // Merge
        return students.map(student => {
            const record = attendanceMap.get(student.id);
            return {
                id: record?.id || `temp-${student.id}`,
                studentId: student.id,
                student: student,
                date: start,
                status: record?.status || 'ABSENT',
                remarks: record?.remarks || (record ? '-' : 'Not Processed'),
                isManual: !record
            };
        });
    }

    /**
     * Manually Update Attendance
     */
    async updateAttendance(tenantId: string, studentId: string, date: Date, status: string, remarks?: string) {
        return prisma.studentAttendance.upsert({
            where: {
                studentId_date: {
                    studentId,
                    date: startOfDay(date)
                }
            },
            update: { status, remarks, updatedAt: new Date() },
            create: {
                tenantId,
                studentId,
                date: startOfDay(date),
                status,
                remarks: remarks || 'Manual Update'
            }
        });
    }
}
