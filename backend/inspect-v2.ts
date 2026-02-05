import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect(targetId: string) {
    console.log(`🔍 INSPECTING DEVICE ID: ${targetId}...\n`);

    // 1. Find the employee linked to this Device ID
    const emp = await prisma.employee.findFirst({
        where: { deviceUserId: targetId },
        include: { shift: true }
    });

    if (emp) {
        console.log(`✅ Linked Employee: ${emp.firstName} ${emp.lastName || ''} (${emp.employeeCode})`);
        console.log(`   Internal ID: ${emp.id}`);
        console.log(`   Shift: ${emp.shift?.name || 'Default'}`);
    } else {
        console.log(`❌ No Employee found linked to Device ID '${targetId}'. Checking raw logs directly...`);
    }

    // 2. Check Raw Logs for Jan 2026
    const janStart = new Date('2026-01-01T00:00:00');
    const janEnd = new Date('2026-02-01T00:00:00');

    console.log(`\n📅 RAW PUNCHES (Jan 2026):`);

    const logs = await prisma.rawDeviceLog.findMany({
        where: {
            deviceUserId: targetId,
            punchTime: { gte: janStart, lt: janEnd }
        },
        orderBy: { punchTime: 'asc' }
    });

    if (logs.length === 0) {
        console.log('   ⚠️ NO LOGS FOUND for this ID in January.');
    } else {
        console.log(`   Found ${logs.length} punches.`);

        // Group by day to show presence/absence
        const days = new Set(logs.map(l => l.punchTime.toISOString().split('T')[0]));
        const sortedDays = Array.from(days).sort();

        console.log(`   Present on ${sortedDays.length} days:`);
        console.log(`   [First 5 Days]: ${sortedDays.slice(0, 5).join(', ')} ...`);
        console.log(`   [Last 5 Days]:  ... ${sortedDays.slice(-5).join(', ')}`);

        // Check specifically for Jan 1-8 (The gap you saw)
        console.log('\n   Start of Month Check:');
        for (let d = 1; d <= 8; d++) {
            const dateStr = `2026-01-0${d}`;
            const punches = logs.filter(l => l.punchTime.toISOString().startsWith(dateStr));
            if (punches.length > 0) {
                console.log(`   ✅ ${dateStr}: ${punches.length} punches (${punches.map(p => p.punchTime.toLocaleTimeString()).join(', ')})`);
            } else {
                console.log(`   ❌ ${dateStr}: MISSING`);
            }
        }
    }
}

const target = process.argv[2];
if (!target) {
    console.error('Please provide a Device ID (e.g., HO004)');
} else {
    inspect(target)
        .catch(console.error)
        .finally(() => prisma.$disconnect());
}
