import { reprocessHistoricalLogs } from './src/services/logSyncService';

async function run() {
    console.log('🔄 REPROCESSING ALL HISTORY FROM JANUARY...');

    const janStart = new Date('2026-01-01T00:00:00');
    const result = await reprocessHistoricalLogs(janStart);

    console.log('\n✅ REPROCESSING COMPLETE');
    console.log(`- Sessions Analyzed: ${result.pairsProcessed}`);
    console.log(`- Matrix Records Updated: ${result.recordsUpdated}`);
}

run().catch(console.error);
