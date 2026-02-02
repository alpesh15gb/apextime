
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAttendance() {
    console.log('--- RECENTLY JOINED EMPLOYEES ---');
    const emps = await prisma.employee.findMany({
        where: {
            joiningDate: { gte: new Date('2026-01-01') }
        },
        orderBy: { joiningDate: 'desc' }
    });

    for (const emp of emps) {
        console.log(`\nEmployee: ${emp.firstName} ${emp.lastName} (Code: ${emp.employeeCode}, DeviceID: ${emp.deviceUserId})`);
        console.log(`Joined: ${emp.joiningDate}`);

        const logsCount = await prisma.attendanceLog.count({
            where: { employeeId: emp.id }
        });
        console.log(`Attendance Records: ${logsCount}`);

        // Get first few records
        const logs = await prisma.attendanceLog.findMany({
            where: { employeeId: emp.id },
            orderBy: { date: 'asc' },
            take: 5
        });

        logs.forEach(l => {
            console.log(` - ${l.date.toISOString().split('T')[0]}: ${l.status}`);
        });

        // Check if there are logs BEFORE the joining date
        const preJoiningLogs = await prisma.attendanceLog.count({
            where: {
                employeeId: emp.id,
                date: { lt: emp.joiningDate }
            }
        });
        if (preJoiningLogs > 0) {
            console.log(`⚠️ WARNING: Found ${preJoiningLogs} attendance records BEFORE joining date!`);
        }
    }
}

debugAttendance().finally(() => prisma.$disconnect());
