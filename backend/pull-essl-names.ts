import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queueUserInfoPull() {
    console.log('🔄 Queueing USERINFO pull command for all active devices...');

    // 1. Get all devices (or filter by specific ones if needed)
    const devices = await prisma.device.findMany({
        where: {
            isActive: true,
            status: 'online' // Only target online devices or all? Let's do all active to catch them when they come online.
        }
    });

    if (devices.length === 0) {
        console.log('⚠️ No active devices found.');
        return;
    }

    console.log(`📱 Found ${devices.length} active devices.`);

    for (const d of devices) {
        console.log(` - Queueing for [${d.name}] (${d.deviceId})...`);

        // 2. Clear any existing pending commands to avoid duplication/clutter? 
        // Optional, but good practice.
        // await prisma.deviceCommand.deleteMany({
        //     where: { deviceId: d.id, status: 'PENDING', command: 'DATA QUERY USERINFO' }
        // });

        // 3. Create the command
        await prisma.deviceCommand.create({
            data: {
                deviceId: d.id,
                tenantId: d.tenantId,
                commandType: 'DATA QUERY USERINFO', // The ADMS command to upload user data
                status: 'PENDING',
                // issuedAt does not exist in schema, relying on createdAt
                payload: '{}' // No arguments needed
            }
        });

        console.log(`   ✅ Command queued for ${d.name}`);
    }

    console.log('🚀 All commands queued! Devices will process them on next heartbeat.');
}

queueUserInfoPull()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
