import { PrismaClient } from '@prisma/client';
import { reprocessHistoricalLogs } from './src/services/logSyncService';

const prisma = new PrismaClient();

async function run() {
    console.log('🔄 REPROCESSING ALL HISTORY FROM JANUARY...');

    // Diagnostic: Check latest log in system
    const latestLog = await prisma.rawDeviceLog.findFirst({
        orderBy: { punchTime: 'desc' },
        select: { punchTime: true }
    });

    if (latestLog) {
        console.log(`📡 Current Sync Progress: Machine has uploaded logs up to: ${latestLog.punchTime.toISOString()}`);
    } else {
        console.log('📡 System Status: No raw logs found in database yet.');
    }

    const janStart = new Date('2026-01-01T00:00:00');

    // Check how many logs exist for January vs February
    const janCount = await prisma.rawDeviceLog.count({ where: { punchTime: { gte: janStart, lt: new Date('2026-02-01') } } });
    const febCount = await prisma.rawDeviceLog.count({ where: { punchTime: { gte: new Date('2026-02-01') } } });

    console.log(`📊 Log Inventory: January: ${janCount} logs, February: ${febCount} logs.`);

    if (janCount === 0) {
        console.log('⚠️  WARNING: No logs found for January 2026. Reports will be empty.');
        console.log('             Make sure the machines have finished uploading January data.');
    }

    const result = await reprocessHistoricalLogs(janStart);

    console.log('\n✅ REPROCESSING COMPLETE');
    console.log(`- Sessions Analyzed: ${result.pairsProcessed}`);
    console.log(`- Matrix Records Updated: ${result.recordsUpdated}`);

    // Add a summary of what's in the attendance log now
    const totalJan = await prisma.attendanceLog.count({ where: { date: { gte: janStart, lt: new Date('2026-02-01') } } });
    const totalFeb = await prisma.attendanceLog.count({ where: { date: { gte: new Date('2026-02-01') } } });

    console.log(`\n📊 ATTENDANCE SUMMARY IN DB:`);
    console.log(`- January 2026: ${totalJan} records`);
    console.log(`- February 2026: ${totalFeb} records`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
