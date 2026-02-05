import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('--- STARTING FORCE PULL FOR NYU7254300525 ---');
    try {
        const device = await prisma.device.findFirst({
            where: { deviceId: 'NYU7254300525' }
        });

        if (!device) {
            console.log('❌ Device NYU7254300525 not found in database.');
            return;
        }

        // Clear existing pending commands
        await prisma.deviceCommand.deleteMany({
            where: { deviceId: device.id, status: 'PENDING' }
        });

        // Create a fresh GET_LOGS command
        await prisma.deviceCommand.create({
            data: {
                tenantId: device.tenantId,
                deviceId: device.id,
                commandType: 'GET_LOGS',
                payload: JSON.stringify({ startTime: '2026-01-01 00:00:00' }),
                status: 'PENDING',
                priority: 10
            }
        });

        console.log('✅ SUCCESS: Pull command from Jan 1st 2026 queued.');
        console.log('Now wait for the machine heartbeat (~30s).');
    } catch (err) {
        console.error('❌ Error during force pull:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
