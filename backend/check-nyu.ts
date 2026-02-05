import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('--- REMOTE MACHINE DIAGNOSTICS (NYU7254300525) ---');
    try {
        const device = await prisma.device.findFirst({
            where: { deviceId: 'NYU7254300525' }
        });

        if (!device) {
            console.log('❌ Device not found.');
            return;
        }

        const now = new Date();
        const lastSeen = new Date(device.lastSeen || 0);
        const diffSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);

        console.log(`DEVICE ID: ${device.deviceId}`);
        console.log(`STATUS: ${device.status}`);
        console.log(`LAST SEEN: ${lastSeen.toISOString()} (${diffSeconds} seconds ago)`);

        const pendingCommands = await prisma.deviceCommand.count({
            where: { deviceId: device.id, status: 'PENDING' }
        });

        const completedCommands = await prisma.deviceCommand.findMany({
            where: { deviceId: device.id, status: 'COMPLETED' },
            orderBy: { completedAt: 'desc' },
            take: 5
        });

        console.log(`\nPENDING ORDERS: ${pendingCommands}`);
        console.log('--- LATEST COMPLETED ORDERS ---');
        if (completedCommands.length === 0) {
            console.log('No commands have been completed recently.');
        }
        completedCommands.forEach(c => {
            console.log(`- [${c.completedAt?.toISOString()}] ${c.commandType} (ID: ${c.id.substring(0, 8)})`);
        });

        const logsCount = await prisma.rawDeviceLog.count({
            where: { deviceId: device.id }
        });
        console.log(`\nTOTAL LOGS IN DB: ${logsCount}`);

        if (diffSeconds < 120) {
            console.log('\n🟢 HEARTBEAT ACTIVE: The machine is currently talking to the server.');
        } else {
            console.log('\n🔴 SILENT: The machine has not checked in for over 2 minutes.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
