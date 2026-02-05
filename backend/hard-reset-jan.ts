import { PrismaClient } from '@prisma/client';
import { DeviceCommandService } from './src/services/deviceCommandService';

const prisma = new PrismaClient();
const commandService = new DeviceCommandService();

async function hardReset() {
    console.log('🚮 HARD RESET: Starting cleanup from January 1st, 2026...');

    const janStart = new Date('2026-01-01T00:00:00');

    // 1. Delete Processed Attendance Logs
    const deletedAttendance = await prisma.attendanceLog.deleteMany({
        where: {
            date: { gte: janStart }
        }
    });
    console.log(`✅ Deleted ${deletedAttendance.count} processed attendance logs.`);

    // 2. Delete Raw Device Logs (punches)
    const deletedRaw = await prisma.rawDeviceLog.deleteMany({
        where: {
            punchTime: { gte: janStart }
        }
    });
    console.log(`✅ Deleted ${deletedRaw.count} raw device logs.`);

    // 3. Reset Sync Logs
    await prisma.syncLog.deleteMany({});
    console.log(`✅ Reset all sync status logs.`);

    // 4. Queue Pull Commands for all active devices
    const devices = await prisma.device.findMany({
        where: { isActive: true }
    });

    console.log(`📡 Queuing 'Fetch History' commands for ${devices.length} active devices...`);

    for (const device of devices) {
        try {
            // Queue GET_LOGS from Jan 1st
            await commandService.fetchLogs(device.id, '2026-01-01 00:00:00');
            console.log(`   - Queued pull for ${device.name || device.deviceId}`);
        } catch (err) {
            console.error(`   - Failed to queue for ${device.deviceId}:`, err);
        }
    }

    console.log('\n--- RESET COMPLETE ---');
    console.log('NEXT STEPS:');
    console.log('1. Wait for machines to check in (Heartbeat).');
    console.log('2. They will receive the pull command and start sending Jan/Feb logs.');
    console.log('3. These logs will be saved to RawDeviceLog.');
    console.log('4. Once syncing stops, run the reprocessing script to update the Attendance Matrix.');
}

hardReset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
