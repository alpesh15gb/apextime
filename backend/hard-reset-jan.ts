import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runCleanup() {
    console.log('🚮 NUCLEAR WIPE: Deleting ALL Jan and Feb 2026 data...');

    const janStart = new Date('2026-01-01T00:00:00');

    // 1. Delete Processed Attendance Logs
    const deletedAttendance = await prisma.attendanceLog.deleteMany({
        where: {
            date: { gte: janStart }
        }
    });
    console.log(`✅ Deleted ${deletedAttendance.count} Attendance Records.`);

    // 2. Delete Raw Device Logs
    const deletedRaw = await prisma.rawDeviceLog.deleteMany({
        where: {
            punchTime: { gte: janStart }
        }
    });
    console.log(`✅ Deleted ${deletedRaw.count} Raw Punches.`);

    // 3. Clear Pending Commands (to start fresh)
    const deletedCmds = await prisma.deviceCommand.deleteMany({
        where: {
            status: 'PENDING'
        }
    });
    console.log(`✅ Cleared ${deletedCmds.count} Pending Commands.`);

    // 4. Delete Sync Logs
    const deletedSync = await prisma.syncLog.deleteMany({});
    console.log(`✅ Reset Sync Logs.`);

    console.log('\n✨ SYSTEM IS NOW CLEAN. Standing by for fresh data...');
}

runCleanup()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
