import { startLogSync } from './src/services/logSyncService';

async function run() {
    console.log('🔄 Syncing logs (this will pull latest from SQL Server)...');
    await startLogSync(true); // Run a full sync to ensure Feb is covered
    console.log('✅ Sync complete.');
}

run().catch(console.error);
