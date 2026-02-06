
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFeb6() {
    console.log("--- DEBUGGING FEB 6th LOGS ---");

    // 1. Define Window (UTC)
    // Feb 6th IST is Feb 5th 18:30 UTC to Feb 6th 18:29 UTC.
    // We'll broaden the search to catch everything.
    const start = new Date('2026-02-05T18:00:00Z');
    const end = new Date('2026-02-06T19:00:00Z');

    console.log(`Searching RawDeviceLogs between ${start.toISOString()} and ${end.toISOString()}...`);

    const logs = await prisma.rawDeviceLog.findMany({
        where: {
            punchTime: {
                gte: start,
                lte: end
            }
        },
        select: {
            deviceUserId: true,
            userId: true,
            punchTime: true,
            timestamp: true,
            userName: true
        }
    });

    console.log(`Total Raw Logs Found: ${logs.length}`);

    // Group by User
    const userLogs = new Map();
    for (const log of logs) {
        const uId = log.deviceUserId || log.userId;
        if (!uId) continue;
        if (!userLogs.has(uId)) userLogs.set(uId, []);
        userLogs.get(uId).push(log);
    }

    console.log(`Unique Users Found in Logs: ${userLogs.size}`);
    console.log([...userLogs.keys()].join(', '));

    // 2. Resolve Employees
    console.log("\n--- RESOLVING EMPLOYEES ---");

    // Cache simulation
    const employees = await prisma.employee.findMany({
        select: { id: true, firstName: true, employeeCode: true, deviceUserId: true, sourceEmployeeId: true }
    });

    console.log(`Total Employees in DB: ${employees.length}`);

    for (const [uId, punches] of userLogs) {
        let matchedEmp = null;
        const sId = uId.toString().trim();

        // MATCHING LOGIC
        // 1. Direct
        matchedEmp = employees.find(e => e.deviceUserId === sId || e.employeeCode === sId || e.sourceEmployeeId === sId);

        // 2. HO Prefix
        if (!matchedEmp && /^\d+$/.test(sId) && sId.length <= 4) {
            const hoCode = `HO${sId.padStart(3, '0')}`;
            matchedEmp = employees.find(e => e.employeeCode === hoCode || e.deviceUserId === hoCode);
        }

        if (!matchedEmp) {
            console.log(`❌ User [${uId}] (${punches.length} logs) - NO MATCHING EMPLOYEE RECORD`);
            continue;
        }

        console.log(`✅ User [${uId}] matches -> ${matchedEmp.firstName} (${matchedEmp.employeeCode})`);

        // 3. Check Date Processing
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const dates = new Set();

        for (const log of punches) {
            const t = log.punchTime || log.timestamp;
            if (!t) continue;

            const istTime = new Date(t.getTime() + IST_OFFSET);
            const hour = istTime.getUTCHours();

            // Shift logic
            if (hour < 5) {
                istTime.setDate(istTime.getDate() - 1);
            }

            const y = istTime.getUTCFullYear();
            const m = String(istTime.getUTCMonth() + 1).padStart(2, '0');
            const d = String(istTime.getUTCDate()).padStart(2, '0');
            dates.add(`${y}-${m}-${d}`);
        }

        console.log(`   -> Logical Dates: ${[...dates].join(', ')}`);
    }
}

debugFeb6()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
