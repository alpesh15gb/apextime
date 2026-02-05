import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFeb() {
    console.log('🔎 CHECKING FEB 1ST GHOST PUNCHES...\n');

    // 1. Fetch Attendance Logs specifically for Feb 1st
    // We check the exact stored date in DB
    const feb1Date = new Date('2026-02-01T00:00:00.000Z');

    const ghosts = await prisma.attendanceLog.findMany({
        where: {
            date: feb1Date
        },
        include: { employee: true },
        take: 10
    });

    if (ghosts.length === 0) {
        console.log('✅ NO RECORDS found in DB for Feb 1st (UTC Midnight).');
        console.log('   If you see them on Dashboard, the Frontend is shifting dates!');
    } else {
        console.log(`⚠️ FOUND ${ghosts.length} records for Feb 1st!`);
        ghosts.forEach(g => {
            console.log(`   - Emp: ${g.employee.firstName} | In: ${g.firstIn?.toISOString()} | Out: ${g.lastOut?.toISOString()}`);
        });
    }

    // 2. Check Jan 31 to compare
    const jan31Date = new Date('2026-01-31T00:00:00.000Z');
    const prevs = await prisma.attendanceLog.count({ where: { date: jan31Date } });
    console.log(`\n(Context: There are ${prevs} records for Jan 31st)`);
}

checkFeb()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
