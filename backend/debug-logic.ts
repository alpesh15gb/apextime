import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function trace(targetId: string, dateStr: string) {
    console.log(`🕵️‍♂️ TRACING LOGIC FOR ID: ${targetId} ON ${dateStr}...\n`);

    // 1. Fetch Raw Logs
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    console.log(`   Query Range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);

    const logs = await prisma.rawDeviceLog.findMany({
        where: {
            deviceUserId: targetId,
            punchTime: { gte: dayStart, lt: dayEnd }
        },
        orderBy: { punchTime: 'asc' } // DB Sorting
    });

    if (logs.length === 0) {
        console.log('❌ NO LOGS FOUND IN DB');
        return;
    }

    console.log(`\n📄 RAW LOGS FROM DB (${logs.length}):`);
    logs.forEach(l => {
        console.log(`   - ID: ${l.id} | Time: ${l.punchTime.toISOString()} | Local: ${l.punchTime.toLocaleString()}`);
    });

    // 2. Simulate the Logic from logSyncService.ts
    console.log(`\n🧠 SIMULATING LOGIC:`);

    // Sort logic used in code
    logs.sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());
    console.log(`   Sorted First: ${logs[0].punchTime.toLocaleString()}`);
    console.log(`   Sorted Last:  ${logs[logs.length - 1].punchTime.toLocaleString()}`);

    const firstIn = logs[0].punchTime;
    const lastOut = logs.length > 1 ? logs[logs.length - 1].punchTime : undefined;

    let workingHours = 0;
    if (firstIn && lastOut) {
        workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
    }

    console.log(`\n📊 CALCULATED RESULT:`);
    console.log(`   First In: ${firstIn ? firstIn.toLocaleString() : 'NULL'}`);
    console.log(`   Last Out: ${lastOut ? lastOut.toLocaleString() : 'NULL'}`);
    console.log(`   Duration: ${workingHours.toFixed(2)} hours`);
    console.log(`   Status:   ${workingHours > 4 ? 'Present' : 'Absent/HalfDay'}`);

    if (!firstIn) console.error('   🚨 ERROR: First In is missing!');
    if (!lastOut && logs.length > 1) console.error('   🚨 ERROR: Last Out is missing despite multiple logs!');
    if (workingHours < 0) console.error('   🚨 ERROR: Negative working hours! Timezone/Sorting fail.');
}

const target = process.argv[2];
const date = process.argv[3] || '2026-01-08';

if (!target) {
    console.error('Usage: npx ts-node debug-logic.ts <DeviceID> [YYYY-MM-DD]');
} else {
    trace(target, date)
        .catch(console.error)
        .finally(() => prisma.$disconnect());
}
