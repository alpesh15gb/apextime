
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nukeKeystone() {
    const tenantName = 'Keystone Infra Pvt Ltd';
    console.log(`--- NUKING DATA FOR TENANT: ${tenantName} ---`);

    const tenant = await prisma.tenant.findFirst({
        where: { name: tenantName }
    });

    if (!tenant) {
        console.error('ERROR: Tenant "Keystone Infra Pvt Ltd" not found!');
        return;
    }

    const tId = tenant.id;
    console.log(`Found Tenant ID: ${tId}. Starting cascade deletion...`);

    try {
        // 1. Attendance & Raw Logs
        console.log('Deleting Attendance Logs...');
        await prisma.attendanceLog.deleteMany({ where: { tenantId: tId } });

        console.log('Deleting Raw Device Logs...');
        await prisma.rawDeviceLog.deleteMany({ where: { tenantId: tId } });

        // 2. Payroll & Payslips
        console.log('Deleting Payslips & Payroll...');
        await prisma.payslip.deleteMany({ where: { tenantId: tId } });
        await prisma.payroll.deleteMany({ where: { tenantId: tId } });

        // 3. Leaves & Balances
        console.log('Deleting Leave Data...');
        await prisma.leaveBalance.deleteMany({ where: { tenantId: tId } });
        await prisma.leaveEntry.deleteMany({ where: { tenantId: tId } });

        // 4. Employee Related
        console.log('Deleting Loans, Documents, Salary Components...');
        await prisma.loan.deleteMany({ where: { tenantId: tId } });
        await prisma.employeeDocument.deleteMany({ where: { tenantId: tId } });
        await prisma.employeeSalaryComponent.deleteMany({ where: { tenantId: tId } });
        await prisma.employeeShift.deleteMany({ where: { tenantId: tId } });
        await prisma.fieldLog.deleteMany({ where: { tenantId: tId } });

        // 5. Employees & Users
        // Important: Some Employees might be linked to Users.
        console.log('Deleting Employees...');
        // We first handle User references if any
        const employees = await prisma.employee.findMany({ where: { tenantId: tId }, select: { id: true } });
        const empIds = employees.map(e => e.id);

        await prisma.user.deleteMany({ where: { employeeId: { in: empIds } } });
        await prisma.employee.deleteMany({ where: { tenantId: tId } });

        // 6. Devices
        console.log('Deleting Devices...');
        await prisma.device.deleteMany({ where: { tenantId: tId } });

        // 7. Structure (Optional - but starting fresh usually means this too)
        console.log('Deleting Departments, Designations, Branches, Shifts...');
        await prisma.holiday.deleteMany({ where: { tenantId: tId } });
        await prisma.designation.deleteMany({ where: { tenantId: tId } });
        await prisma.department.deleteMany({ where: { tenantId: tId } });
        await prisma.branch.deleteMany({ where: { tenantId: tId } });
        await prisma.category.deleteMany({ where: { tenantId: tId } });
        await prisma.location.deleteMany({ where: { tenantId: tId } });
        await prisma.shift.deleteMany({ where: { tenantId: tId } });

        // 8. Sync Logs
        await prisma.syncLog.deleteMany({ where: { tenantId: tId } });

        console.log('--- CLEANUP COMPLETE ---');
        console.log(`Tenant "${tenantName}" is now an empty shell. Ready for fresh import.`);
    } catch (error) {
        console.error('DELETION FAILED:', error);
    }
}

nukeKeystone()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
