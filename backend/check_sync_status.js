
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rawCount = await prisma.rawDeviceLog.count();
    const attCount = await prisma.attendanceLog.count();

    console.log(`Total Raw Logs: ${rawCount}`);
    console.log(`Total Attendance Records: ${attCount}`);

    const latestRaw = await prisma.rawDeviceLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5
    });
    console.log('--- LATEST 5 RAW LOGS ---');
    console.log(JSON.stringify(latestRaw, null, 2));

    const latestAtt = await prisma.attendanceLog.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: { employee: { select: { firstName: true, lastName: true } } }
    });
    console.log('--- LATEST 5 ATTENDANCE RECORDS ---');
    console.log(JSON.stringify(latestAtt, null, 2));
}

main();
