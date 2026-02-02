import { prisma } from '../config/database';
import { Asset, AssetAssignment } from '@prisma/client';

export class AssetService {

    // Create Asset category
    static async createCategory(tenantId: string, name: string, description?: string) {
        return prisma.assetCategory.create({
            data: { tenantId, name, description }
        });
    }

    // Get All Assets
    static async getAssets(tenantId: string) {
        return prisma.asset.findMany({
            where: { tenantId },
            include: { category: true, assignments: { where: { status: 'ACTIVE' }, include: { employee: true } } }
        });
    }

    // Create Asset
    static async createAsset(tenantId: string, data: any) {
        return prisma.asset.create({
            data: {
                ...data,
                tenantId
            }
        });
    }

    // Assign Asset
    static async assignAsset(tenantId: string, assetId: string, employeeId: string, remarks?: string) {
        // Check if asset is available
        const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId } });
        if (!asset || asset.status !== 'AVAILABLE') throw new Error("Asset not available");

        // Transaction: Update Asset Status + Create Assignment
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

    // Return Asset
    static async returnAsset(tenantId: string, assignmentId: string, returnCondition: string) {
        const assignment = await prisma.assetAssignment.findFirst({ where: { id: assignmentId, tenantId } });
        if (!assignment) throw new Error("Assignment not found");

        return prisma.$transaction(async (tx) => {
            await tx.assetAssignment.update({
                where: { id: assignment.id },
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
}
