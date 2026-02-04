import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const empCount = await prisma.employee.count();
    const logCount = await prisma.attendanceLog.count();
    const rawCount = await prisma.rawDeviceLog.count();

    console.log('Total Employees:', empCount);
    console.log('Total Attendance Logs:', logCount);
    console.log('Total Raw Logs:', rawCount);

    const testEmps = await prisma.employee.findMany({
        where: { firstName: { contains: 'Auto' } },
        take: 5
    });
    console.log('Sample Hik/Auto Emps:', JSON.stringify(testEmps, null, 2));

    const recentAttendance = await prisma.attendanceLog.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: { employee: true }
    });
    console.log('Recent Attendance:', JSON.stringify(recentAttendance, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
