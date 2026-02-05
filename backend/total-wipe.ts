import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nuclearWipe() {
    console.log('⚠️  WARNING: STARTING TOTAL SYSTEM WIPE (V2 - CLEANING ALL TABLES)...');

    // 1. Delete Attendance & Logs
    await prisma.attendanceLog.deleteMany({});
    await prisma.rawDeviceLog.deleteMany({});
    console.log('✅ Deleted Attendance & Raw Logs.');

    // 2. Delete Employee Relations (The "Foreign Key" blocks)
    await prisma.fieldLog.deleteMany({});
    await prisma.leaveEntry.deleteMany({});
    await prisma.leaveBalanceTransaction.deleteMany({});
    await prisma.leaveBalance.deleteMany({});
    await prisma.employeeSalaryComponent.deleteMany({});
    await prisma.payslip.deleteMany({});
    await prisma.loanDeduction.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.assetAssignment.deleteMany({});
    await prisma.assetRequest.deleteMany({});
    await prisma.employeeDocument.deleteMany({});
    await prisma.employeeShift.deleteMany({});
    await prisma.payroll.deleteMany({});
    console.log('✅ Deleted all Employee dependencies (FieldLogs, Leaves, Payroll, etc).');

    // 3. Delete Users linked to Employees (except superadmins)
    const userCount = await prisma.user.deleteMany({
        where: { NOT: { role: 'superadmin' } }
    });
    console.log(`✅ Deleted ${userCount.count} User accounts.`);

    // 4. Finally delete All Employees
    const empCount = await prisma.employee.deleteMany({});
    console.log(`✅ Deleted ${empCount.count} Employee records.`);

    console.log('\n✨ SYSTEM IS NOW COMPLETELY EMPTY.');
}

nuclearWipe()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
