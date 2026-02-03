const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeIssue() {
    console.log('\n========================================');
    console.log('TIME DIAGNOSTIC REPORT');
    console.log('========================================\n');

    // 1. Check Server Timezone
    console.log('1. SERVER ENVIRONMENT:');
    console.log('   TZ Environment:', process.env.TZ || 'Not Set');
    console.log('   Server Time (now):', new Date().toISOString());
    console.log('   Server Time (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('   Server Offset:', new Date().getTimezoneOffset() / -60, 'hours from UTC\n');

    // 2. Check Latest 5 Raw Logs
    console.log('2. LATEST 5 RAW DEVICE LOGS:');
    const logs = await prisma.rawDeviceLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: { device: true }
    });

    if (logs.length === 0) {
        console.log('   No logs found!\n');
    } else {
        logs.forEach((log, i) => {
            console.log(`\n   Log #${i + 1}:`);
            console.log('   Device:', log.device?.name || 'Unknown');
            console.log('   User ID:', log.deviceUserId);
            console.log('   Stored (UTC):', log.timestamp.toISOString());
            console.log('   Stored (IST):', log.timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
            console.log('   PunchTime (UTC):', log.punchTime?.toISOString() || 'N/A');
            console.log('   PunchTime (IST):', log.punchTime ? log.punchTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A');
            console.log('   Created:', log.createdAt?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) || 'N/A');
        });
    }

    // 3. Check Latest Attendance Records
    console.log('\n\n3. LATEST 5 ATTENDANCE RECORDS:');
    const attendance = await prisma.attendance.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: { employee: true }
    });

    if (attendance.length === 0) {
        console.log('   No attendance records found!\n');
    } else {
        attendance.forEach((att, i) => {
            console.log(`\n   Record #${i + 1}:`);
            console.log('   Employee:', att.employee?.firstName, att.employee?.lastName);
            console.log('   Date:', att.date);
            console.log('   Check In (UTC):', att.checkIn?.toISOString() || 'N/A');
            console.log('   Check In (IST):', att.checkIn ? att.checkIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A');
            console.log('   Check Out (UTC):', att.checkOut?.toISOString() || 'N/A');
            console.log('   Check Out (IST):', att.checkOut ? att.checkOut.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A');
        });
    }

    // 4. Simulate Parsing
    console.log('\n\n4. PARSING SIMULATION:');
    const testTime = '2026-02-03 09:00:00';
    console.log('   Input String:', testTime);
    console.log('   After .replace():', testTime.replace(' ', 'T'));
    console.log('   After +05:30:', testTime.replace(' ', 'T') + '+05:30');
    const parsed = new Date(testTime.replace(' ', 'T') + '+05:30');
    console.log('   Parsed Date (UTC):', parsed.toISOString());
    console.log('   Parsed Date (IST):', parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
    console.log('   Parsed Date (Tokyo):', parsed.toLocaleString('en-IN', { timeZone: 'Asia/Tokyo', hour12: false }));

    console.log('\n========================================');
    console.log('DIAGNOSIS COMPLETE');
    console.log('========================================\n');

    await prisma.$disconnect();
}

checkTimeIssue().catch(console.error);
