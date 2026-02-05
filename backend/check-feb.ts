import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFeb() {
    console.log('--- CHECKING FEBRUARY 2026 STATUS ---');

    const runs = await prisma.payrollRun.findMany({
        where: { month: 2, year: 2026 }
    });
    console.log(`Found ${runs.length} Payroll Runs for Feb 2026:`);
    runs.forEach(r => console.log(`  - Run ID: ${r.id}, Status: ${r.status}, Name: ${r.batchName}`));

    const logsCount = await prisma.attendanceLog.count({
        where: {
            date: {
                gte: new Date(2026, 1, 1),
                lte: new Date(2026, 1, 28, 23, 59, 59)
            }
        }
    });
    console.log(`\nTotal Attendance Logs for Feb 2026: ${logsCount}`);

    if (logsCount > 0) {
        const sampleLogs = await prisma.attendanceLog.findMany({
            where: {
                date: {
                    gte: new Date(2026, 1, 1),
                    lte: new Date(2026, 1, 28, 23, 59, 59)
                }
            },
            take: 5,
            include: { employee: true }
        });
        console.log('\nSample Logs:');
        sampleLogs.forEach(l => console.log(`  - ${l.date.toISOString().split('T')[0]}: ${l.employee?.firstName} (${l.employee?.employeeCode}) -> ${l.status}`));
    }
}

checkFeb().catch(console.error).finally(() => prisma.$disconnect());
