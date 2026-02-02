
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function killEmps() {
    console.log('--- SURGICAL EMPLOYEE CLEANUP ---');
    const tenant = await prisma.tenant.findFirst({
        where: { name: 'Keystone Infra Pvt Ltd' }
    });

    if (!tenant) {
        console.log('Tenant not found.');
        return;
    }

    const tid = tenant.id;
    const emps = await prisma.employee.findMany({
        where: { tenantId: tid }
    });

    console.log(`Found ${emps.length} employees to remove.`);

    for (const emp of emps) {
        try {
            // Clear all possible relations
            await prisma.attendanceLog.deleteMany({ where: { employeeId: emp.id } });
            await prisma.employeeShift.deleteMany({ where: { employeeId: emp.id } });
            await prisma.user.deleteMany({ where: { employeeId: emp.id } });
            await prisma.leaveEntry.deleteMany({ where: { employeeId: emp.id } });
            await prisma.leaveBalance.deleteMany({ where: { employeeId: emp.id } });
            await prisma.payslip.deleteMany({ where: { employeeId: emp.id } });
            await prisma.payroll.deleteMany({ where: { employeeId: emp.id } });
            await prisma.employeeSalaryComponent.deleteMany({ where: { employeeId: emp.id } });
            await prisma.employeeDocument.deleteMany({ where: { employeeId: emp.id } });
            await prisma.loan.deleteMany({ where: { employeeId: emp.id } });

            await prisma.employee.delete({ where: { id: emp.id } });
            console.log(`Deleted employee: ${emp.employeeCode}`);
        } catch (e) {
            console.log(`Failed to delete ${emp.employeeCode}: ${e.message}`);
        }
    }
    console.log('--- CLEANUP FINISHED ---');
}

killEmps().finally(() => prisma.$disconnect());
