import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startOfToday = new Date('2026-02-04T00:00:00Z');
    const endOfToday = new Date('2026-02-05T23:59:59Z');

    console.log(`--- SCANNING ALL LOGS FOR TODAY (Feb 4-5) ---`);

    const todayLogs = await prisma.rawDeviceLog.findMany({
        where: {
            timestamp: { gte: startOfToday, lte: endOfToday }
        },
        take: 10,
        orderBy: { timestamp: 'desc' }
    });

    console.log(`Punches found for Today: ${todayLogs.length}`);
    if (todayLogs.length > 0) {
        console.log('Sample Today Log:', JSON.stringify(todayLogs[0], null, 2));
    } else {
        console.log('NO LOGS FOUND FOR FEB 4-5.');

        const absoluteLatest = await prisma.rawDeviceLog.findFirst({
            orderBy: { timestamp: 'desc' }
        });
        console.log('The absolute latest log in the DB is from:', absoluteLatest?.timestamp);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
