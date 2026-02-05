import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugAttendance() {
    const code = 'YLR480';
    console.log(`--- DEBUGGING ATTENDANCE FOR CODE: ${code} ---`);

    const emps = await prisma.employee.findMany({
        where: { employeeCode: code },
        select: { id: true, employeeCode: true, firstName: true }
    });
    console.log('Employees found with this code:', JSON.stringify(emps, null, 2));

    if (emps.length === 0) {
        console.log('No employees found with this code.');
        return;
    }

    const empIds = emps.map(e => e.id);

    const logs = await prisma.attendanceLog.findMany({
        where: {
            employeeId: { in: empIds }
        },
        orderBy: { date: 'desc' }
    });

    console.log(`Total AttendanceLogs found for these IDs: ${logs.length}`);
    logs.slice(0, 20).forEach(l => {
        console.log(`  - Date: ${l.date.toISOString()} | Status: ${l.status} | EmpID: ${l.employeeId}`);
    });

    // Also check Raw Device Logs just in case
    const rawLogs = await prisma.rawDeviceLog.findMany({
        where: {
            deviceUserId: code
        },
        orderBy: { timestamp: 'desc' },
        take: 10
    });
    console.log(`\nTotal RawDeviceLogs found for deviceUserId ${code}: ${rawLogs.length}`);
    rawLogs.forEach(rl => {
        console.log(`  - Timestamp: ${rl.timestamp.toISOString()} | Processed: ${rl.isProcessed}`);
    });

    // Check DeviceLog (some systems use this instead)
    const deviceLogs = await prisma.deviceLog.findMany({
        where: {
            OR: [
                { employeeId: { in: empIds } },
                { deviceUserId: code }
            ]
        },
        orderBy: { punchTime: 'desc' },
        take: 10
    });
    console.log(`\nTotal DeviceLogs found: ${deviceLogs.length}`);
    deviceLogs.forEach(dl => {
        console.log(`  - PunchTime: ${dl.punchTime.toISOString()} | Status: ${dl.punchType}`);
    });
}

debugAttendance().catch(console.error).finally(() => prisma.$disconnect());
