import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb(targetId: string, dateStr: string) {
    console.log(`🔎 CHECKING FINAL DB RECORD FOR: ${targetId} ON ${dateStr}...\n`);

    // 1. Find Employee
    const emp = await prisma.employee.findFirst({
        where: { deviceUserId: targetId }
    });

    if (!emp) {
        console.log('❌ Employee not found!');
        return;
    }

    console.log(`✅ Employee: ${emp.firstName} (Internal ID: ${emp.id})`);

    // 2. Find Attendance Log
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`); // UTC midnight

    const attLog = await prisma.attendanceLog.findFirst({
        where: {
            employeeId: emp.id,
            date: targetDate
        }
    });

    if (!attLog) {
        console.log(`❌ No Attendance Log found for ${dateStr} (UTC).`);
    } else {
        console.log(`\n📄 ATTENDANCE LOG RECORD:`);
        console.log(`   - ID: ${attLog.id}`);
        console.log(`   - Date: ${attLog.date.toISOString()}`);
        console.log(`   - First In:  ${attLog.firstIn ? attLog.firstIn.toISOString() : 'NULL'}`);
        console.log(`   - Last Out:  ${attLog.lastOut ? attLog.lastOut.toISOString() : 'NULL'}`);
        console.log(`   - Work Hrs:  ${attLog.workingHours}`);
        console.log(`   - Status:    ${attLog.status}`);
        console.log(`   - Punches:   ${attLog.totalPunches}`);
    }
}

const target = process.argv[2];
const date = process.argv[3] || '2026-01-08';

if (!target) console.error('Provide DeviceID');
else checkDb(target, date).catch(console.error).finally(() => prisma.$disconnect());
