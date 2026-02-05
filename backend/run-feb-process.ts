import { startLogSync, reprocessHistoricalLogs } from './src/services/logSyncService';

async function run() {
    console.log('🚀 Starting February 2026 Attendance Processing...');

    const febStart = new Date('2026-02-01T00:00:00');
    const febEnd = new Date('2026-02-28T23:59:59');

    // 1. We need to ensure logs are synced for February. 
    // Since startLogSync doesn't take a range easily, we can manually trigger the sync for a specific period
    // or just run a full sync. Given we want FEB, we can run a sync and hope it pulls Feb.
    // However, reprocessHistoricalLogs works on RawDeviceLog. 
    // If Feb raw logs are already in RawDeviceLog, we just need to reprocess.

    console.log('Step 1: Reprocessing Attendance for February 2026 Period...');
    const result = await reprocessHistoricalLogs(febStart, febEnd);

    console.log(`✅ February Attendance Processed:`);
    console.log(`- Sessions Analyzed: ${result.pairsProcessed}`);
    console.log(`- Attendance Records Updated: ${result.recordsUpdated}`);
}

run().catch(console.error);
