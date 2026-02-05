import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function sendGetLogsCommand() {
    console.log('📡 SENDING "GET_LOGS" (DATA QUERY ATTLOG) COMMAND...');

    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) {
        console.error('❌ NYU Device not found');
        return;
    }

    // Clear pending
    await prisma.deviceCommand.deleteMany({
        where: {
            deviceId: device.id,
            status: 'PENDING'
        }
    });

    // Create GET_LOGS command
    // This generates: C:ID:DATA QUERY ATTLOG StartTime=2026-01-01 00:00:00
    const command = await prisma.deviceCommand.create({
        data: {
            tenantId: device.tenantId,
            deviceId: device.id,
            commandType: 'GET_LOGS',
            payload: JSON.stringify({
                startTime: '2026-01-01 00:00:00'
            }),
            status: 'PENDING',
            priority: 1
        }
    });

    console.log(`✅ Command Created: ${command.id}`);
    console.log(`📋 Type: ${command.commandType}`);
    console.log(`📋 Payload: ${command.payload}`);
    console.log(`\n⏳ Waiting for device to pick up command...`);
}

sendGetLogsCommand()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
