import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importFromClipboard() {
    console.log('📥 STARTING DEBUG IMPORT...');

    console.log(`🔍 Looking for Tenant: 'Keystone Infra Pvt Ltd'...`);
    const tenant = await prisma.tenant.findFirst({
        where: { name: 'Keystone Infra Pvt Ltd' }
    });

    if (!tenant) {
        console.error('❌ ERROR: Tenant not found in database!');
        return;
    }
    console.log(`✅ Found Tenant: ${tenant.name} (${tenant.id})`);

    console.log(`🔍 Looking for Device: 'NYU7254300525'...`);
    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) {
        console.error('❌ ERROR: NYU Device (NYU7254300525) not found in database!');
        return;
    }
    console.log(`✅ Found Device: ${device.name} (Internal ID: ${device.id})`);

    const filePath = path.join(__dirname, 'clipboard_data.txt');
    if (!fs.existsSync(filePath)) {
        console.error(`❌ ERROR: File not found at ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    console.log(`📊 Processing ${lines.length} lines from file...`);

    let imported = 0;
    let skippedByDate = 0;
    let invalidFormat = 0;
    let firstErrorLogged = false;

    const jan1st = new Date('2026-01-01T00:00:00');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(/(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);

        if (!match) {
            invalidFormat++;
            continue;
        }

        const [_, deviceUserId, dateStr, timeStr] = match;
        const punchTime = new Date(`${dateStr}T${timeStr}`);

        if (isNaN(punchTime.getTime()) || punchTime < jan1st) {
            skippedByDate++;
            continue;
        }

        const uniqueId = `USB_${deviceUserId}_${punchTime.getTime()}`;

        try {
            await prisma.rawDeviceLog.upsert({
                where: { id: uniqueId },
                update: {},
                create: {
                    id: uniqueId,
                    tenantId: tenant.id,
                    deviceId: device.id,
                    userId: deviceUserId,
                    deviceUserId: deviceUserId,
                    punchTime: punchTime,
                    timestamp: punchTime,
                    punchType: '0',
                    isProcessed: false
                }
            });
            imported++;
        } catch (e: any) {
            if (!firstErrorLogged) {
                console.error(`❌ CRITICAL UPSERT ERROR: ${e.message}`);
                firstErrorLogged = true;
            }
        }
    }

    console.log(`✅ IMPORT FINISHED.`);
    console.log(`- Imported: ${imported} logs`);
    console.log(`- Skipped (Old Logs): ${skippedByDate}`);
    console.log(`- Bad Format: ${invalidFormat}`);
}

importFromClipboard()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
