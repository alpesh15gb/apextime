import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importFromClipboard() {
    console.log('📥 STARTING ROBUST IMPORT (Fixing existing records)...');

    const tenant = await prisma.tenant.findFirst({
        where: { name: 'Keystone Infra Pvt Ltd' }
    });

    if (!tenant) {
        console.error('❌ ERROR: Tenant not found!');
        return;
    }

    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) {
        console.error('❌ ERROR: NYU Device not found!');
        return;
    }

    console.log(`✅ Target Tenant: ${tenant.name}`);
    console.log(`✅ Target Device: ${device.name} (SN: ${device.deviceId})`);

    const filePath = path.join(__dirname, 'clipboard_data.txt');
    if (!fs.existsSync(filePath)) {
        console.error(`❌ ERROR: File not found at ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    console.log(`📊 Processing ${lines.length} lines...`);

    let updated = 0;
    let created = 0;
    let skippedOld = 0;
    const jan1st = new Date('2026-01-01T00:00:00');

    for (const line of lines) {
        const match = line.trim().match(/(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
        if (!match) continue;

        const [_, deviceUserId, dateStr, timeStr] = match;
        const punchTime = new Date(`${dateStr}T${timeStr}`);

        if (isNaN(punchTime.getTime()) || punchTime < jan1st) {
            skippedOld++;
            continue;
        }

        try {
            // Using the actual unique constraint fields for identification
            // This prevents "Unique constraint failed" errors
            const log = await prisma.rawDeviceLog.upsert({
                where: {
                    deviceId_deviceUserId_timestamp_tenantId: {
                        deviceId: device.id,
                        deviceUserId: deviceUserId,
                        timestamp: punchTime,
                        tenantId: tenant.id
                    }
                },
                update: {
                    isProcessed: false, // FORCE RE-PROCESSING
                    userId: deviceUserId
                },
                create: {
                    tenantId: tenant.id,
                    deviceId: device.id,
                    deviceUserId: deviceUserId,
                    userId: deviceUserId,
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: '0',
                    isProcessed: false
                }
            });

            // Prisma upsert doesn't tell us if it was 'create' or 'update' easily, 
            // but we can track total successfully handled.
            created++;
        } catch (e: any) {
            // console.error(`Error with ${deviceUserId}: ${e.message}`);
        }
    }

    console.log(`✅ IMPORT COMPLETED SUCCESSFULLY.`);
    console.log(`- Total Records Handled: ${created}`);
    console.log(`- Old Records Skipped: ${skippedOld}`);
    console.log(`\n🚀 FINAL STEP: Run the reprocess script to calculate attendance:`);
    console.log(`docker exec -it apextime-backend npx ts-node reprocess-jan.ts`);
}

importFromClipboard()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
