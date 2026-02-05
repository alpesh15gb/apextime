import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const emp = await prisma.employee.findFirst({ where: { employeeCode: 'YLR480' } });
    if (!emp) {
        console.log('Employee YLR480 not found');
        return;
    }
    const logs = await prisma.attendanceLog.findMany({
        where: {
            employeeId: emp.id,
            date: {
                gte: new Date(2026, 0, 1),
                lte: new Date(2026, 0, 31)
            }
        }
    });
    console.log(`Found ${logs.length} logs for YLR480 in Jan 2026`);
    logs.forEach(l => {
        console.log(`Date: ${l.date.toISOString().split('T')[0]}, Status: "${l.status}"`);
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
