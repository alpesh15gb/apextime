
// direct-sync-names-v2.ts
import { syncEmployeeNamesFromDeviceUsers } from './src/services/logSyncService';
import { prisma } from './src/config/database';

async function run() {
    try {
        console.log('Starting direct sync names v2...');
        // Override logger for console output
        const consoleLogger = {
            info: (msg: string) => console.log(`[INFO] ${msg}`),
            error: (msg: string, err: any) => console.error(`[ERROR] ${msg}`, err),
            warn: (msg: string) => console.warn(`[WARN] ${msg}`),
        };

        // We can't easily mock the module logger without editing the service, 
        // but the service function prints to console too? No, it uses 'logger'.
        // Let's just run it and wait. It might be taking time to query SQL Server.

        const result = await syncEmployeeNamesFromDeviceUsers();
        console.log('Result:', result);
    } catch (error) {
        console.error('Error in runner:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

run();
