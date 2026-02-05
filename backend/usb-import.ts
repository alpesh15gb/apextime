import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// The raw data you provided (truncated for script, but I will process everything pasted)
const rawData = `
         HO033	2025-12-30 14:13:42	1	255	15	0
         HO033	2025-12-30 14:13:43	1	255	15	0
         HO033	2025-12-30 14:13:48	1	255	1	0
         HO077	2025-12-30 14:20:11	1	255	1	0
         HO077	2025-12-30 14:20:11	1	255	15	0
         HO035	2025-12-30 14:21:17	1	255	1	0
         HO035	2025-12-30 14:21:18	1	255	15	0
         HO064	2025-12-30 14:22:47	1	255	15	0
         HO064	2025-12-30 14:22:48	1	255	15	0
         HO064	2025-12-30 14:22:49	1	255	15	0
         HO064	2025-12-30 14:22:50	1	255	1	0
         HO064	2025-12-30 14:22:51	1	255	15	0
         HO064	2025-12-30 14:22:52	1	255	15	0
         HO039	2025-12-30 14:40:06	1	255	15	0
         HO039	2025-12-30 14:40:08	1	255	15	0
         HO038	2025-12-30 15:00:38	1	255	15	0
         HO060	2025-12-30 15:04:06	1	255	15	0
         HO060	2025-12-30 15:04:07	1	255	15	0
         HO060	2025-12-30 15:04:08	1	255	15	0
         HO060	2025-12-30 15:04:09	1	255	15	0
         HO012	2025-12-30 15:08:23	1	255	15	0
         HO012	2025-12-30 15:08:25	1	255	15	0
         HO012	2025-12-30 15:08:26	1	255	15	0
         HO060	2025-12-30 15:08:28	1	255	15	0
         HO060	2025-12-30 15:08:30	1	255	15	0
         HO038	2025-12-30 15:08:31	1	255	15	0
         HO012	2025-12-30 15:08:37	1	255	15	0
         HO038	2025-12-30 15:13:30	1	255	15	0
         HO046	2025-12-30 15:21:18	1	255	1	0
         HO038	2025-12-30 15:21:19	1	255	15	0
         HO038	2025-12-30 15:21:20	1	255	15	0
         HO038	2025-12-30 15:46:54	1	255	15	0
         HO030	2025-12-30 15:49:20	1	255	15	0
         HO030	2025-12-30 15:49:21	1	255	15	0
         HO030	2025-12-30 15:49:23	1	255	15	0
         HO030	2025-12-30 15:49:24	1	255	15	0
         HO038	2025-12-30 15:49:26	1	255	15	0
         HO038	2025-12-30 15:49:28	1	255	15	0
         HO038	2025-12-30 15:54:08	1	255	15	0
         HO030	2025-12-30 15:58:44	1	255	15	0
         HO038	2025-12-30 16:04:13	1	255	15	0
         HO038	2025-12-30 16:04:14	1	255	15	0
         HO038	2025-12-30 16:04:15	1	255	15	0
`;

async function importFromClipboard() {
    console.log('📥 STARTING CLIPBOARD IMPORT...');

    const tenant = await prisma.tenant.findFirst({
        where: { name: 'Keystone Infra Pvt Ltd' }
    });

    if (!tenant) throw new Error('Tenant not found');

    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) throw new Error('NYU Device not found');

    // If the user pasted the file content into a file on the server, we read it
    const filePath = path.join(__dirname, 'clipboard_data.txt');
    let content = '';
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
        console.log(`📖 Reading data from ${filePath}...`);
    } else {
        content = rawData; // Fallback to provided snippet
        console.log('📖 Using pasted snippet...');
    }

    const lines = content.split('\n').filter(l => l.trim());
    let imported = 0;
    let skipped = 0;

    for (const line of lines) {
        // Handle Tab or Space separation
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;

        const deviceUserId = parts[0];
        const dateStr = parts[1];
        const timeStr = parts[2];
        const punchTime = new Date(`${dateStr}T${timeStr}`);

        if (isNaN(punchTime.getTime())) continue;

        // Skip anything before Jan 1st
        if (punchTime < new Date('2026-01-01T00:00:00')) {
            skipped++;
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
        } catch (e) {
            // console.error(e.message);
        }
    }

    console.log(`✅ IMPORT FINISHED.`);
    console.log(`- Imported: ${imported} logs`);
    console.log(`- Skipped (Pre-2026): ${skipped} logs`);
    console.log(`\n🚀 NEXT STEP: Run 'npx ts-node reprocess-jan.ts' to update the reports.`);
}

importFromClipboard()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
