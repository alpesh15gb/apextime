import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const code = 'YLR002';
    console.log(`--- INSPECTING EMPLOYEE: ${code} ---`);

    const employee = await prisma.employee.findFirst({
        where: { employeeCode: code }
    });

    if (!employee) {
        console.log('Employee not found!');
        return;
    }

    console.log('Employee Data:', JSON.stringify(employee, null, 2));

    const rawLogs = await prisma.rawDeviceLog.findMany({
        where: {
            OR: [
                { userId: employee.deviceUserId },
                { deviceUserId: employee.deviceUserId },
                { userId: employee.employeeCode }
            ]
        },
        orderBy: { timestamp: 'desc' },
        take: 10
    });
    console.log(`Recent Raw Logs (${rawLogs.length}):`, JSON.stringify(rawLogs, null, 2));

    const attendanceLogs = await prisma.attendanceLog.findMany({
        where: { employeeId: employee.id },
        orderBy: { date: 'desc' },
        take: 10
    });
    console.log(`Recent Attendance Logs (${attendanceLogs.length}):`, JSON.stringify(attendanceLogs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
