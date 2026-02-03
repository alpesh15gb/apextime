import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SchoolService {
    /**
     * Create a new Academic Session
     */
    async createSession(tenantId: string, data: any) {
        // Validation
        if (!data.name || !data.startDate || !data.endDate) {
            throw new Error('Name, Start Date and End Date are required');
        }

        // If this is set as current, unset others
        if (data.isCurrent) {
            await prisma.academicSession.updateMany({
                where: { tenantId, isCurrent: true },
                data: { isCurrent: false }
            });
        }

        return prisma.academicSession.create({
            data: {
                name: data.name,
                code: data.code || null,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isCurrent: !!data.isCurrent,
                tenantId
            }
        });
    }

    /**
     * Create a Course (e.g. Class 10)
     */
    async createCourse(tenantId: string, data: any) {
        if (!data.name) throw new Error('Course name is required');

        return prisma.course.create({
            data: {
                name: data.name,
                code: data.code || null,
                description: data.description || null,
                duration: data.duration ? parseInt(String(data.duration)) : null,
                type: data.type || 'CLASS',
                tenantId
            }
        });
    }

    /**
     * Create a Batch (e.g. Section A)
     */
    async createBatch(tenantId: string, data: any) {
        if (!data.name || !data.courseId || !data.sessionId) {
            throw new Error('Name, Course, and Session are required');
        }

        return prisma.batch.create({
            data: {
                name: data.name,
                courseId: data.courseId,
                sessionId: data.sessionId,
                maxStrength: data.maxStrength ? parseInt(String(data.maxStrength)) : null,
                inchargeId: data.inchargeId || null,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                tenantId
            }
        });
    }

    /**
     * Admit a Student
     */
    async admitStudent(tenantId: string, data: any) {
        // Check for duplicate admission number
        const existing = await prisma.student.findUnique({
            where: {
                tenantId_admissionNo: {
                    tenantId,
                    admissionNo: data.admissionNo
                }
            }
        });

        if (existing) {
            throw new Error(`Admission Number ${data.admissionNo} already exists`);
        }

        // Fetch session from batch if not provided
        let sessionId = data.sessionId;
        if (!sessionId && data.batchId) {
            const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
            sessionId = batch?.sessionId;
        }

        if (!sessionId) throw new Error('Academic Session is required');

        // Create Guardian if provided
        let guardianId = data.guardianId;
        if (data.guardian) {
            const guardian = await prisma.guardian.create({
                data: {
                    ...data.guardian,
                    tenantId
                }
            });
            guardianId = guardian.id;
        }

        // Create Student
        return prisma.student.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                admissionNo: data.admissionNo,
                rollNo: data.rollNo || null,
                email: data.email || null,
                phone: data.phone || null,
                gender: data.gender || null,
                dob: data.dob ? new Date(data.dob) : null,
                bloodGroup: data.bloodGroup || null,
                sessionId: sessionId,
                batchId: data.batchId,
                guardianId: guardianId,
                dateOfAdmission: new Date(data.dateOfAdmission),
                address: data.address || null,
                city: data.city || null,
                state: data.state || null,
                zipCode: data.zipCode || null,
                transportRouteId: data.transportRouteId || null,
                tenantId
            }
        });
    }

    /**
     * Get Students by Batch (Class)
     */
    async getStudentsByBatch(tenantId: string, batchId?: string) {
        const where: any = {
            tenantId,
            status: 'ACTIVE'
        };

        if (batchId) {
            where.batchId = batchId;
        }

        return prisma.student.findMany({
            where,
            include: {
                guardian: true,
                batch: {
                    include: {
                        course: true
                    }
                }
            },
            orderBy: {
                firstName: 'asc'
            }
        });
    }

    // --------------------------------------------------------
    // ACADEMIC DATA GETTERS
    // --------------------------------------------------------

    async getSessions(tenantId: string) {
        return prisma.academicSession.findMany({
            where: { tenantId },
            orderBy: { startDate: 'desc' }
        });
    }

    async getCourses(tenantId: string) {
        return prisma.course.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: { batches: true, subjects: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async getBatches(tenantId: string, courseId?: string) {
        const where: any = { tenantId };
        if (courseId) where.courseId = courseId;

        return prisma.batch.findMany({
            where,
            include: {
                course: true,
                incharge: true,
                _count: {
                    select: { students: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    // --------------------------------------------------------
    // SUBJECT MANAGEMENT
    // --------------------------------------------------------

    async createSubject(tenantId: string, data: any) {
        if (!data.name) throw new Error('Subject name is required');

        return prisma.subject.create({
            data: {
                name: data.name,
                code: data.code || null,
                type: data.type || 'THEORY',
                courseId: data.courseId || null,
                tenantId
            }
        });
    }

    async getSubjects(tenantId: string, courseId?: string) {
        const where: any = { tenantId };
        if (courseId) where.courseId = courseId;

        return prisma.subject.findMany({
            where,
            include: {
                course: true
            },
            orderBy: { name: 'asc' }
        });
    }

    // --------------------------------------------------------
    // TIMETABLE MANAGEMENT
    // --------------------------------------------------------

    async createTimetableEntry(tenantId: string, data: any) {
        return prisma.timetableEntry.create({
            data: {
                tenantId,
                batchId: data.batchId,
                subjectId: data.subjectId,
                teacherId: data.teacherId || null,
                dayOfWeek: parseInt(data.dayOfWeek),
                startTime: data.startTime,
                endTime: data.endTime
            }
        });
    }

    async getTimetable(tenantId: string, batchId: string) {
        return prisma.timetableEntry.findMany({
            where: { tenantId, batchId },
            include: {
                subject: true,
                teacher: true
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
    }
}
