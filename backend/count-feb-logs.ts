import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const start = new Date('2026-02-01');
    const end = new Date('2026-03-01');
    const count = await prisma.rawDeviceLog.count({
        where: {
            punchTime: {
                gte: start,
                lt: end
            }
        }
    });
    console.log(`FEB_RAW_LOGS_COUNT: ${count}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
