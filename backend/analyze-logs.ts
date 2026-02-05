import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('📊 ANALYZING RAW LOG DISTRIBUTION FOR JANUARY 2026...');

    const janStart = new Date('2026-01-01T00:00:00');
    const janEnd = new Date('2026-02-01T00:00:00');

    const logs = await prisma.rawDeviceLog.groupBy({
        by: ['userId', 'deviceUserId'],
        where: {
            punchTime: { gte: janStart, lt: janEnd }
        },
        _count: {
            _all: true
        }
    });

    console.log('\nID Distribution (userId / deviceUserId | Count):');
    logs.forEach(l => {
        console.log(`- ${l.userId} / ${l.deviceUserId} : ${l._count._all} logs`);
    });

    // Check mapping status
    console.log('\n🔍 MAPPING STATUS:');
    const uniqueIds = Array.from(new Set(logs.map(l => l.deviceUserId)));

    for (const uId of uniqueIds) {
        const emp = await prisma.employee.findFirst({
            where: {
                OR: [
                    { deviceUserId: uId },
                    { employeeCode: uId },
                    { sourceEmployeeId: uId }
                ]
            },
            select: { id: true, firstName: true, employeeCode: true, deviceUserId: true }
        });

        if (emp) {
            console.log(`✅ ID ${uId} maps to: ${emp.firstName} (${emp.employeeCode}) [DID: ${emp.deviceUserId}]`);
        } else {
            console.log(`❌ ID ${uId} is UNMAPPED (Will create 'Auto-User')`);
        }
    }
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
