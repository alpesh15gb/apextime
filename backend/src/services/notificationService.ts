import { prisma } from '../config/database';

export class NotificationService {

    /**
     * Create a notification for a user (or all users in a tenant)
     */
    static async sendNotification(tenantId: string, data: {
        userId?: string;
        title: string;
        message: string;
        type: 'INFO' | 'WARNING' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL';
        link?: string;
    }) {
        return prisma.notification.create({
            data: {
                tenantId,
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                link: data.link
            }
        });
    }

    /**
     * Broadcast an announcement to everyone in a tenant
     */
    static async createAnnouncement(tenantId: string, data: {
        title: string;
        content: string;
        category?: string;
        priority?: 'LOW' | 'NORMAL' | 'HIGH';
        expiresAt?: Date;
    }) {
        return prisma.announcement.create({
            data: {
                tenantId,
                title: data.title,
                content: data.content,
                category: data.category || 'GENERAL',
                priority: data.priority || 'NORMAL',
                expiresAt: data.expiresAt
            }
        });
    }

    /**
     * Send a notification to all employees in a tenant
     */
    static async notifyAllEmployees(tenantId: string, data: {
        title: string;
        message: string;
        type: 'INFO' | 'WARNING' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL';
        link?: string;
    }) {
        const employees = await prisma.employee.findMany({
            where: { tenantId, isActive: true },
            select: { user: { select: { id: true } } }
        });

        const notificationData = employees
            .filter(e => e.user?.id)
            .map(e => ({
                tenantId,
                userId: e.user!.id,
                title: data.title,
                message: data.message,
                type: data.type,
                link: data.link
            }));

        if (notificationData.length > 0) {
            return prisma.notification.createMany({
                data: notificationData
            });
        }
    }
}
