import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nuclearWipe() {
    console.log('⚠️  WARNING: STARTING TOTAL SYSTEM WIPE...');
    console.log('This will delete all attendance, raw logs, and employees.');

    // 1. Delete Attendance Logs
    const attCount = await prisma.attendanceLog.deleteMany({});
    console.log(`✅ Deleted ${attCount.count} Attendance Logs.`);

    // 2. Delete Raw Device Logs
    const rawCount = await prisma.rawDeviceLog.deleteMany({});
    console.log(`✅ Deleted ${rawCount.count} Raw Device Logs.`);

    // 3. Delete Employee Relations (Salary components, documents, etc. to avoid constraints)
    await prisma.employeeSalaryComponent.deleteMany({});
    await prisma.leaveEntry.deleteMany({});
    await prisma.attendanceLog.deleteMany({});
    await prisma.payslip.deleteMany({});

    // 4. Delete Users linked to Employees (except superadmins)
    const userCount = await prisma.user.deleteMany({
        where: { NOT: { role: 'superadmin' } }
    });
    console.log(`✅ Deleted ${userCount.count} User accounts.`);

    // 5. Delete All Employees
    const empCount = await prisma.employee.deleteMany({});
    console.log(`✅ Deleted ${empCount.count} Employee records.`);

    console.log('\n✨ SYSTEM IS NOW EMPTY. You have a clean slate.');
}

nuclearWipe()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
