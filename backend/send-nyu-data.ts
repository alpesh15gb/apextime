import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function sendDataCommand() {
    console.log('📡 SENDING DATA PULL COMMAND TO NYU MACHINE...');

    // Find the NYU device
    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) {
        console.error('❌ ERROR: NYU Device not found in database!');
        return;
    }

    console.log(`✅ Found Device: ${device.name} (${device.deviceId})`);

    // Insert the DATA command
    const command = await prisma.deviceCommand.create({
        data: {
            tenantId: device.tenantId,
            deviceId: device.id,
            commandType: 'DATA',
            payload: 'C:ID:DATA',
            status: 'PENDING',
            priority: 1
        }
    });

    console.log(`✅ Command Created: ${command.id}`);
    console.log(`📋 Command Type: ${command.commandType}`);
    console.log(`📋 Payload: ${command.payload}`);
    console.log(`📋 Status: ${command.status}`);
    console.log(`\n⏳ The NYU machine will receive this command on its next check-in (usually within 1-2 minutes).`);
    console.log(`   Watch the logs or check the Attendance Matrix in a few minutes to see new data appearing.`);
}

sendDataCommand()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
