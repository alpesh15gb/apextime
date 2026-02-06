const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = '2026-02-06';
    console.log('Querying for date:', today);

    const logs = await prisma.attendanceLog.findMany({
        where: {
            date: {
                gte: new Date(today + 'T00:00:00Z'),
                lte: new Date(today + 'T23:59:59Z'),
            }
        },
        include: { employee: true }
    });

    console.log(`Found ${logs.length} logs for ${today}:`);
    logs.forEach(l => {
        console.log(`- ${l.employee.firstName} ${l.employee.lastName} (${l.employee.employeeCode}): ${l.date.toISOString()} - Status: ${l.status}`);
    });

    // Check all logs for last 2 days to see if they are shifted
    const allLogs = await prisma.attendanceLog.findMany({
        where: {
            date: {
                gte: new Date('2026-02-04T00:00:00Z')
            }
        },
        include: { employee: true },
        orderBy: { date: 'desc' }
    });

    console.log('\nAll recent logs:');
    allLogs.forEach(l => {
        console.log(`${l.employee.firstName} | ${l.date.toISOString()} | Status: ${l.status}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
