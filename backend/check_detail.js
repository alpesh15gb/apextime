const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const date = '2026-02-06';
    console.log(`Analyzing logs for date: ${date}`);

    // Query 1: Strict UTC
    const logs1 = await prisma.attendanceLog.findMany({
        where: { date: new Date(date + 'T00:00:00Z') },
        include: { employee: true }
    });
    console.log(`\nStrict UTC (T00:00:00Z) found: ${logs1.length}`);
    logs1.forEach(l => console.log(` - ${l.employee?.firstName} (Tenant: ${l.tenantId})`));

    // Query 2: IST-shifted
    const logs2 = await prisma.attendanceLog.findMany({
        where: { date: new Date('2026-02-05T18:30:00Z') },
        include: { employee: true }
    });
    console.log(`\nIST-shifted (T18:30:00Z) found: ${logs2.length}`);
    logs2.forEach(l => console.log(` - ${l.employee?.firstName} (Tenant: ${l.tenantId})`));

    // Query 3: My new buffered query range
    const gte = new Date(new Date(date + 'T00:00:00Z').getTime() - (6 * 60 * 60 * 1000));
    const lte = new Date(date + 'T23:59:59Z');
    const logs3 = await prisma.attendanceLog.findMany({
        where: {
            date: { gte, lte }
        },
        include: { employee: true }
    });
    console.log(`\nBuffered Query Range [${gte.toISOString()} to ${lte.toISOString()}] found: ${logs3.length}`);
    logs3.forEach(l => console.log(` - ${l.employee?.firstName} | Date: ${l.date.toISOString()} | Status: ${l.status}`));

    // Check Raw logs
    const rawLogs = await prisma.rawDeviceLog.count({
        where: {
            timestamp: {
                gte: new Date('2026-02-06T00:00:00+05:30'),
                lte: new Date('2026-02-06T23:59:59+05:30')
            }
        }
    });
    console.log(`\nRaw logs for Feb 6 IST: ${rawLogs}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
