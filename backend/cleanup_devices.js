
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('Cleaning up virtual devices without protocols...');

    // We keep devices that have a protocol (like HIKVISION_DIRECT or ICLOCK) 
    // and delete the ones created automatically by the sync (which usually have protocol: null)
    const result = await prisma.device.deleteMany({
        where: {
            protocol: null,
            name: { contains: 'Biometric Device' }
        }
    });

    console.log(`Successfully deleted ${result.count} auto-created virtual devices.`);
}

cleanup()
    .catch(e =\u003e console.error(e))
    .finally(() =\u003e prisma.$disconnect());
