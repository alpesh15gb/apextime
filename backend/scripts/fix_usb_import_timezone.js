const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Fix timezone issue in USB imported attendance
 * The times were parsed with +05:30 offset, causing them to be stored 5.5 hours earlier
 */

async function fixTimezones() {
    console.log('🔧 Fixing USB Import Timezone Issues...\n');

    // Get all USB imported logs
    const logs = await prisma.attendanceLog.findMany({
        where: {
            rawData: {
                contains: 'USB Import'
            }
        },
        select: {
            id: true,
            date: true,
            firstIn: true,
            lastOut: true,
            logs: true,
            employeeId: true
        }
    });

    console.log(`📊 Found ${logs.length} USB imported logs to fix\n`);

    let fixed = 0;
    let errors = 0;

    for (const log of logs) {
        try {
            // Add 5.5 hours to all times
            const offset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds

            const newFirstIn = log.firstIn ? new Date(log.firstIn.getTime() + offset) : null;
            const newLastOut = log.lastOut ? new Date(log.lastOut.getTime() + offset) : null;

            // Fix the date (it might have shifted to previous day)
            const correctDate = newFirstIn ? new Date(newFirstIn.toISOString().split('T')[0] + 'T00:00:00.000Z') : log.date;

            // Parse and fix the logs JSON
            let newLogs = log.logs;
            if (log.logs) {
                try {
                    const logsArray = JSON.parse(log.logs);
                    const fixedLogs = logsArray.map(punch => ({
                        time: new Date(new Date(punch.time).getTime() + offset).toISOString(),
                        type: punch.type
                    }));
                    newLogs = JSON.stringify(fixedLogs);
                } catch (e) {
                    console.error(`⚠️  Could not parse logs for ${log.id}`);
                }
            }

            // Calculate new total hours
            const totalHours = newLastOut && newFirstIn
                ? (newLastOut - newFirstIn) / (1000 * 60 * 60)
                : 0;

            // Update the log
            await prisma.attendanceLog.update({
                where: { id: log.id },
                data: {
                    date: correctDate,
                    firstIn: newFirstIn,
                    lastOut: newLastOut,
                    totalHours: totalHours,
                    workingHours: totalHours,
                    logs: newLogs
                }
            });

            fixed++;

            if (fixed % 100 === 0) {
                console.log(`   Fixed ${fixed} logs...`);
            }
        } catch (error) {
            console.error(`❌ Error fixing log ${log.id}:`, error.message);
            errors++;
        }
    }

    console.log('\n✅ Timezone Fix Complete!\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Errors: ${errors}`);

    await prisma.$disconnect();
}

fixTimezones()
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
