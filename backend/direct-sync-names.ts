
// direct-sync-names.ts
import { syncEmployeeNamesFromDeviceUsers } from './src/services/logSyncService';
import { prisma } from './src/config/database';

async function run() {
    try {
        console.log('Starting direct sync names...');
        const result = await syncEmployeeNamesFromDeviceUsers();
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
