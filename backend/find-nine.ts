import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findTheNine() {
    console.log('--- SCANNING ALL EMPLOYEES FOR JAN 2026 ATTENDANCE ---');
    const logs = await prisma.attendanceLog.findMany({
        where: {
            date: {
                gte: new Date(2026, 0, 1),
                lte: new Date(2026, 0, 31, 23, 59, 59)
            }
        },
        include: {
            employee: true
        }
    });

    const stats: Record<string, { name: string, code: string, count: number }> = {};
    logs.forEach(l => {
        const id = l.employeeId;
        if (!stats[id]) {
            stats[id] = {
                name: `${l.employee.firstName} ${l.employee.lastName}`,
                code: l.employee.employeeCode,
                count: 0
            };
        }
        if (l.status.toLowerCase().trim() === 'present') {
            stats[id].count++;
        }
    });

    console.log('RESULTS:');
    Object.values(stats).forEach(s => {
        console.log(`${s.code} | ${s.name} | Present Days: ${s.count}`);
    });
}

findTheNine().catch(console.error).finally(() => prisma.$disconnect());
