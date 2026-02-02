
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const devices = await prisma.device.findMany();
    console.log(JSON.stringify(devices, null, 2));
}

main();
