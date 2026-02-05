import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reprocessStandalone() {
    console.log('🚀 STARTING STANDALONE REPROCESS (IST MODE)...');

    // 1. Fetch ALL Raw Logs for Jan-Feb 2026
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-03-01T00:00:00Z');

    console.log('📥 Fetching raw logs...');
    const allLogs = await prisma.rawDeviceLog.findMany({
        where: {
            punchTime: {
                gte: start,
                lt: end
            }
        },
        orderBy: { punchTime: 'asc' }
    });

    console.log(`✅ Loaded ${allLogs.length} logs.`);

    // 2. Group by User
    const userLogsMap = new Map<string, typeof allLogs>();
    for (const log of allLogs) {
        if (!userLogsMap.has(log.deviceUserId)) {
            userLogsMap.set(log.deviceUserId, []);
        }
        userLogsMap.get(log.deviceUserId)!.push(log);
    }

    console.log(`👥 Found ${userLogsMap.size} unique users.`);

    // 3. Process Each User
    let processedCount = 0;

    for (const [userId, logs] of userLogsMap) {
        // Link to Employee
        const employee = await prisma.employee.findFirst({
            where: { deviceUserId: userId }
        });

        if (!employee) {
            // console.warn(`⚠️ Skipping likely Auto-User ${userId} (No Employee Link)`);
            // We should still process them if they exist in DB as an employee, but if findFirst fails, we can't save to AttendanceLog easily without ID
            // Actually, for Auto-Users created by system, they DO have an employee record.
            continue;
        }

        // Group by Date (IST)
        const dayMap = new Map<string, typeof allLogs>();

        for (const log of logs) {
            // 1. Get IST Date Key (e.g. "2026-01-08") using container's TZ=Asia/Kolkata
            const istDatePart = log.punchTime.toLocaleDateString('en-CA');

            // 2. Get IST Hour (0-23)
            const istHour = parseInt(log.punchTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));

            let dateKey = istDatePart;

            // 3. SHIFT RULE: If punch is between 12:00 AM and 05:00 AM, it belongs to PREVIOUS DAY.
            if (istHour < 5) {
                const d = new Date(dateKey);
                d.setDate(d.getDate() - 1);
                dateKey = d.toISOString().split('T')[0];
            }

            if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
            dayMap.get(dateKey)!.push(log);
        }

        // Analyze and Upsert Sessions
        for (const [dateStr, dayLogs] of dayMap) {
            // Sort just in case
            dayLogs.sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());

            const firstIn = dayLogs[0].punchTime;
            const lastOut = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1].punchTime : null; // Can be null if single punch

            // Calculate hours (approx)
            let workingHours = 0;
            if (firstIn && lastOut) {
                workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
            }

            const status = (workingHours > 0 || dayLogs.length > 0) ? 'Present' : 'Absent';

            // SAVE TO DB
            // We force the 'date' column to be UTC Midnight of that day string.
            // "2026-01-08" -> "2026-01-08T00:00:00.000Z"
            const dbDate = new Date(`${dateStr}T00:00:00.000Z`);

            await prisma.attendanceLog.upsert({
                where: {
                    employeeId_date_tenantId: {
                        employeeId: employee.id,
                        date: dbDate,
                        tenantId: employee.tenantId // We must assume employee has tenantId loaded
                    }
                },
                update: {
                    firstIn: firstIn,
                    lastOut: lastOut, // Prisma handles null
                    workingHours: Number(workingHours.toFixed(2)),
                    totalPunches: dayLogs.length,
                    status: status,
                    // If existing had rawData, maybe keep it? Overwrite for now.
                },
                create: {
                    tenantId: employee.tenantId || 'default-tenant-id', // Fallback or strict
                    employeeId: employee.id,
                    date: dbDate,
                    firstIn: firstIn,
                    lastOut: lastOut,
                    workingHours: Number(workingHours.toFixed(2)),
                    totalPunches: dayLogs.length,
                    status: status
                }
            });
        }
        processedCount++;
        if (processedCount % 50 === 0) process.stdout.write('.');
    }

    console.log(`\n✅ Finished reprocessing ${processedCount} employees.`);
}

reprocessStandalone()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
