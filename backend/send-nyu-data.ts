import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function sendDataCommand() {
    console.log('📡 SENDING DATA PULL COMMAND TO NYU MACHINE (FIXED)...');

    // Find the NYU device
    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) {
        console.error('❌ ERROR: NYU Device not found in database!');
        return;
    }

    console.log(`✅ Found Device: ${device.name} (${device.deviceId})`);

    // Delete any old DATA commands to avoid confusion
    await prisma.deviceCommand.deleteMany({
        where: {
            deviceId: device.id,
            commandType: 'DATA'
        }
    });

    // Insert the DATA command with PENDING status (not SENT!)
    const command = await prisma.deviceCommand.create({
        data: {
            tenantId: device.tenantId,
            deviceId: device.id,
            commandType: 'DATA',
            payload: 'C:ID:DATA',
            status: 'PENDING',  // ← This is critical!
            priority: 1
        }
    });

    console.log(`✅ Command Created: ${command.id}`);
    console.log(`📋 Command Type: ${command.commandType}`);
    console.log(`📋 Status: ${command.status}`);
    console.log(`\n⏳ The NYU machine will receive this command on its next check-in (usually within 1-2 minutes).`);
    console.log(`   Run 'npx ts-node check-nyu-status.ts' to monitor progress.`);
}

sendDataCommand()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
