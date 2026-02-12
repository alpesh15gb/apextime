import { prisma } from '../config/database';
import { Asset, AssetAssignment, AssetRequest, MaintenanceLog, Vendor } from '@prisma/client';

export class AssetService {

    // --- VENDOR MANAGEMENT ---
    static async createVendor(tenantId: string, data: any) {
        return prisma.vendor.create({
            data: { ...data, tenantId }
        });
    }

    static async getVendors(tenantId: string) {
        return prisma.vendor.findMany({
            where: { tenantId }
        });
    }

    // --- ASSET CATEGORIES ---
    static async createCategory(tenantId: string, name: string, description?: string) {
        return prisma.assetCategory.create({
            data: { tenantId, name, description }
        });
    }

    static async getCategories(tenantId: string) {
        return prisma.assetCategory.findMany({
            where: { tenantId }
        });
    }

    // --- ASSET INVENTORY (Upgraded) ---
    static async getDashboardSummary(tenantId: string) {
        const [total, available, assigned, repair] = await Promise.all([
            prisma.asset.count({ where: { tenantId } }),
            prisma.asset.count({ where: { tenantId, status: 'AVAILABLE' } }),
            prisma.asset.count({ where: { tenantId, status: 'ASSIGNED' } }),
            prisma.asset.count({ where: { tenantId, status: 'REPAIR' } }),
        ]);

        const recentRequests = await prisma.assetRequest.count({
            where: { tenantId, status: 'PENDING' }
        });

        return {
            total,
            available,
            assigned,
            repair,
            pendingRequests: recentRequests
        };
    }

    static async getAssets(tenantId: string) {
        return prisma.asset.findMany({
            where: { tenantId },
            include: {
                category: true,
                vendor: true,
                assignments: {
                    where: { status: 'ACTIVE' },
                    include: { employee: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getAssetDetail(tenantId: string, assetId: string) {
        return prisma.asset.findFirst({
            where: { id: assetId, tenantId },
            include: {
                category: true,
                vendor: true,
                parentAsset: true,
                subAssets: true,
                maintenanceLogs: {
                    orderBy: { startDate: 'desc' }
                },
                assignments: {
                    include: { employee: true },
                    orderBy: { assignedDate: 'desc' }
                }
            }
        });
    }

    static async createAsset(tenantId: string, data: any) {
        return prisma.asset.create({
            data: {
                ...data,
                tenantId
            }
        });
    }

    // --- ASSET WORKFLOW (Requests) ---
    static async createAssetRequest(tenantId: string, employeeId: string, categoryId: string, data: any) {
        return prisma.assetRequest.create({
            data: {
                tenantId,
                employeeId,
                assetCategoryId: categoryId,
                description: data.description,
                priority: data.priority || 'NORMAL'
            }
        });
    }

    static async getRequests(tenantId: string) {
        return prisma.assetRequest.findMany({
            where: { tenantId },
            include: { employee: true, category: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async updateRequestStatus(tenantId: string, requestId: string, status: string, remarks?: string) {
        return prisma.assetRequest.update({
            where: { id: requestId },
            data: {
                status,
                rejectionReason: status === 'REJECTED' ? remarks : undefined,
                approvedAt: status === 'APPROVED' ? new Date() : undefined
            }
        });
    }

    // --- ASSIGNMENT & MAINTENANCE ---
    static async assignAsset(tenantId: string, assetId: string, employeeId: string, remarks?: string) {
        const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId } });
        if (!asset || asset.status !== 'AVAILABLE') throw new Error("Asset not available");

        return prisma.$transaction(async (tx) => {
            await tx.asset.update({
                where: { id: assetId },
                data: { status: 'ASSIGNED' }
            });

            return tx.assetAssignment.create({
                data: {
                    tenantId,
                    assetId,
                    employeeId,
                    remarks,
                    assignedDate: new Date()
                }
            });
        });
    }

    static async returnAsset(tenantId: string, assignmentId: string, returnCondition: string) {
        const assignment = await prisma.assetAssignment.findFirst({ where: { id: assignmentId, tenantId } });
        if (!assignment) throw new Error("Assignment not found");

        return prisma.$transaction(async (tx) => {
            await tx.assetAssignment.update({
                where: { id: assignmentId },
                data: {
                    returnDate: new Date(),
                    status: 'RETURNED',
                    returnCondition
                }
            });

            await tx.asset.update({
                where: { id: assignment.assetId },
                data: { status: 'AVAILABLE', condition: returnCondition || 'GOOD' }
            });
        });
    }

    static async addMaintenance(tenantId: string, assetId: string, data: any) {
        return prisma.maintenanceLog.create({
            data: {
                ...data,
                assetId,
                tenantId,
                startDate: new Date(data.startDate)
            }
        });
    }

    static async deleteAsset(tenantId: string, id: string) {
        return prisma.asset.deleteMany({
            where: { id, tenantId }
        });
    }

    static async deleteCategory(tenantId: string, id: string) {
        return prisma.assetCategory.deleteMany({
            where: { id, tenantId }
        });
    }
}
