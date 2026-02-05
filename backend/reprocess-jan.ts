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

    if (latestLog && latestLog.punchTime < janStart) {
        console.log('⚠️  Notice: The machine is still uploading historical data (2025 or earlier).');
        console.log('            Reprocessing for 2026 will start once the sync reaches Jan 2026.');
    }

    const result = await reprocessHistoricalLogs(janStart);

    console.log('\n✅ REPROCESSING COMPLETE');
    console.log(`- Sessions Analyzed: ${result.pairsProcessed}`);
    console.log(`- Matrix Records Updated: ${result.recordsUpdated}`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
