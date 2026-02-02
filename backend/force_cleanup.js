
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) return console.log('No tenant found');

        // 1. Create the Generic SQL Device
        const genericDevice = await prisma.device.upsert({
            where: { deviceId_tenantId: { deviceId: 'SQL_IMPORT_GENERIC', tenantId: tenant.id } },
            update: {},
            create: {
                tenantId: tenant.id,
                deviceId: 'SQL_IMPORT_GENERIC',
                name: 'Legacy SQL Source',
                status: 'online',
                protocol: 'SQL_SERVER'
            }
        });

        console.log('Created generic device bucket:', genericDevice.id);

        // 2. Find all "junk" devices
        const junkDevices = await prisma.device.findMany({
            where: {
                OR: [
                    { protocol: null },
                    { name: { startsWith: 'Biometric Device' } }
                ],
                NOT: {
                    deviceId: 'SQL_IMPORT_GENERIC'
                }
            }
        });

        console.log(`Found ${junkDevices.length} junk devices to clean.`);

        for (const device of junkDevices) {
            // 3. Move logs
            await prisma.rawDeviceLog.updateMany({
                where: { deviceId: device.id },
                data: { deviceId: genericDevice.id }
            });

            // 4. Delete device
            await prisma.device.delete({
                where: { id: device.id }
            });
            console.log(`Deleted device: ${device.name} (${device.deviceId})`);
        }

        console.log('CLEANUP COMPLETE');
    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
