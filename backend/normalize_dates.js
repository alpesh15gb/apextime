const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting AttendanceLog date normalization...');
    const logs = await prisma.attendanceLog.findMany({
        where: {
            date: {
                gte: new Date('2026-01-01T00:00:00Z')
            }
        }
    });

    console.log(`Found ${logs.length} logs to check.`);
    let updatedCount = 0;

    for (const log of logs) {
        const d = new Date(log.date);
        // If it's 18:30Z (5:30 PM UTC), it's likely a shifted IST midnight
        if (d.getUTCHours() !== 0) {
            // Adjust to the NEXT day's UTC midnight if it's evening UTC (likely shifted local)
            // or to the CURRENT day's UTC midnight if it's morning UTC.
            // e.g. 2026-02-05T18:30:00Z -> 2026-02-06T00:00:00Z
            let normalizedDate;
            if (d.getUTCHours() >= 12) {
                normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
            } else {
                normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
            }

            await prisma.attendanceLog.update({
                where: { id: log.id },
                data: { date: normalizedDate }
            });
            updatedCount++;
        }
    }

    console.log(`Normalized ${updatedCount} logs.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
