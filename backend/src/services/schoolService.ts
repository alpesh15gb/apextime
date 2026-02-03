import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SchoolService {
    /**
     * Create a new Academic Session
     */
    async createSession(tenantId: string, data: any) {
        // If this is set as current, unset others
        if (data.isCurrent) {
            await prisma.academicSession.updateMany({
                where: { tenantId, isCurrent: true },
                data: { isCurrent: false }
            });
        }

        return prisma.academicSession.create({
            data: {
                ...data,
                tenantId
            }
        });
    }

    /**
     * Create a Course (e.g. Class 10)
     */
    async createCourse(tenantId: string, data: any) {
        return prisma.course.create({
            data: {
                ...data,
                tenantId
            }
        });
    }

    /**
     * Create a Batch (e.g. Section A)
     */
    async createBatch(tenantId: string, data: any) {
        return prisma.batch.create({
            data: {
                ...data,
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
                rollNo: data.rollNo,
                email: data.email,
                phone: data.phone,
                gender: data.gender,
                dob: data.dob ? new Date(data.dob) : null,
                bloodGroup: data.bloodGroup,
                sessionId: data.sessionId,
                batchId: data.batchId,
                guardianId: guardianId,
                dateOfAdmission: new Date(data.dateOfAdmission),
                address: data.address,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                tenantId
            }
        });
    }

    /**
     * Get Students by Batch (Class)
     */
    async getStudentsByBatch(tenantId: string, batchId: string) {
        return prisma.student.findMany({
            where: {
                tenantId,
                batchId,
                status: 'ACTIVE'
            },
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
}
