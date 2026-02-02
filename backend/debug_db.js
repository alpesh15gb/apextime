
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tenants = await prisma.tenant.findMany();
        console.log('--- TENANTS ---');
        console.log(JSON.stringify(tenants, null, 2));

        const devices = await prisma.device.findMany();
        console.log('--- DEVICES ---');
        console.log(JSON.stringify(devices, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
