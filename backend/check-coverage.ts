import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('--- DATA COVERAGE ANALYSIS ---');
    try {
        const total2026 = await prisma.rawDeviceLog.count({
            where: { punchTime: { gte: new Date('2026-01-01T00:00:00Z') } }
        });
        console.log(`Total 2026 Raw Logs: ${total2026}`);

        const janLogs = await prisma.rawDeviceLog.count({
            where: {
                punchTime: {
                    gte: new Date('2026-01-01T00:00:00Z'),
                    lt: new Date('2026-02-01T00:00:00Z')
                }
            }
        });
        console.log(`January 2026 Raw Logs: ${janLogs}`);

        const febLogs = await prisma.rawDeviceLog.count({
            where: {
                punchTime: {
                    gte: new Date('2026-02-01T00:00:00Z')
                }
            }
        });
        console.log(`February 2026 Raw Logs: ${febLogs}`);

        const earliest = await prisma.rawDeviceLog.findFirst({
            where: { punchTime: { gte: new Date('2026-01-01T00:00:00Z') } },
            orderBy: { punchTime: 'asc' }
        });
        console.log(`Earliest 2026 Punch: ${earliest?.punchTime || 'NONE'}`);

        const attendanceJan = await prisma.attendanceLog.count({
            where: {
                date: {
                    gte: new Date('2026-01-01'),
                    lt: new Date('2026-02-01')
                }
            }
        });
        console.log(`January Attendance Records (Processed): ${attendanceJan}`);

        // Check if any employees are missing names but have logs
        const unmapped = await prisma.rawDeviceLog.findMany({
            where: { punchTime: { gte: new Date('2026-01-01T00:00:00Z') }, isProcessed: false },
            take: 5
        });
        console.log('\n--- UNPROCESSED LOGS (Sample) ---');
        unmapped.forEach(l => {
            console.log(`- User: ${l.userId}, Time: ${l.punchTime}, Device: ${l.deviceId}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
