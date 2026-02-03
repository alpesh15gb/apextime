import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SchoolFinanceService {

    // --------------------------------------------------------
    // FEE HEADS (e.g. Tuition, Transport)
    // --------------------------------------------------------
    async createFeeHead(tenantId: string, data: any) {
        return prisma.feeHead.create({
            data: { ...data, tenantId }
        });
    }

    async getFeeHeads(tenantId: string) {
        return prisma.feeHead.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' }
        });
    }

    // --------------------------------------------------------
    // FEE STRUCTURES (e.g. Class 10 Tuition = 5000)
    // --------------------------------------------------------
    async createFeeStructure(tenantId: string, data: any) {
        return prisma.feeStructure.create({
            data: { ...data, tenantId }
        });
    }

    async getFeeStructures(tenantId: string, courseId?: string) {
        const where: any = { tenantId };
        if (courseId) where.courseId = courseId;

        return prisma.feeStructure.findMany({
            where,
            include: {
                head: true,
                course: true
            },
            orderBy: { course: { name: 'asc' } }
        });
    }

    // --------------------------------------------------------
    // FEE COLLECTION & INVOICING
    // --------------------------------------------------------

    /**
     * Generate Fee Records (Invoices) for a Student
     */
    async generateInvoice(tenantId: string, data: { studentId: string, structureId: string, dueDate: Date }) {
        const structure = await prisma.feeStructure.findUnique({
            where: { id: data.structureId },
            include: { head: true }
        });

        if (!structure) throw new Error('Fee Structure not found');

        return prisma.feeRecord.create({
            data: {
                tenantId,
                studentId: data.studentId,
                structureId: data.structureId,
                title: `${structure.head.name} - ${structure.head.frequency || 'One Time'}`,
                amount: structure.amount,
                dueDate: new Date(data.dueDate),
                status: 'PENDING'
            }
        });
    }

    /**
     * Collect Payment
     */
    async collectFee(recordId: string, amount: number, mode: string, txnId?: string, remarks?: string) {
        const record = await prisma.feeRecord.findUnique({ where: { id: recordId } });
        if (!record) throw new Error('Fee Record not found');

        const newPaidAmount = record.paidAmount + amount;
        let status = record.status;

        if (newPaidAmount >= record.amount) {
            status = 'PAID';
        } else if (newPaidAmount > 0) {
            status = 'PARTIAL';
        }

        return prisma.feeRecord.update({
            where: { id: recordId },
            data: {
                paidAmount: newPaidAmount,
                paidDate: new Date(),
                paymentMode: mode,
                transactionId: txnId,
                remarks,
                status
            }
        });
    }

    /**
     * Get Student Fee History
     */
    async getStudentFees(tenantId: string, studentId: string) {
        return prisma.feeRecord.findMany({
            where: { studentId },
            include: {
                structure: { include: { head: true } }
            },
            orderBy: { dueDate: 'desc' }
        });
    }

    // --------------------------------------------------------
    // DASHBOARD STATS
    // --------------------------------------------------------
    async getStats(tenantId: string) {
        const totalCollected = await prisma.feeRecord.aggregate({
            where: { tenantId },
            _sum: { paidAmount: true }
        });

        // Note: For aggregate across relations, we need to filter students by tenantId
        // Prisma doesn't support deep relation filter in aggregate easily without raw query or loop.
        // For now, let's just fetch pending counts via findMany for safety or ignore for MVP.
        return { totalCollected: totalCollected._sum.paidAmount || 0 };
    }
}
