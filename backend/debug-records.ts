import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE INSPECTION ---');

    const tenants = await prisma.tenant.findMany();
    console.log('Tenants:', tenants.map(t => ({ id: t.id, name: t.name })));

    const employees = await prisma.employee.findMany({
        where: { employeeCode: 'YLR002' },
        include: { shift: true }
    });
    console.log('Sample Employee (YLR002):', JSON.stringify(employees, null, 2));

    if (employees.length > 0) {
        const empId = employees[0].id;
        const logs = await prisma.attendanceLog.findMany({
            where: { employeeId: empId },
            orderBy: { date: 'desc' },
            take: 10
        });
        console.log('Attendance Logs for YLR002:', JSON.stringify(logs, null, 2));
    }

    const statusCounts = await prisma.attendanceLog.groupBy({
        by: ['status'],
        _count: true
    });
    console.log('Status Counts:', statusCounts);

    const recentRaw = await prisma.rawDeviceLog.findMany({
        orderBy: { punchTime: 'desc' },
        take: 5
    });
    console.log('Recent Raw Logs:', JSON.stringify(recentRaw, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
