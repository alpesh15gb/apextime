const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nukeKeystone() {
    const tenantName = 'Keystone Infra Pvt Ltd';
    console.log(`--- INDUSTRIAL STRENGTH NUKE: ${tenantName} ---`);

    const tenant = await prisma.tenant.findFirst({
        where: { name: tenantName }
    });

    if (!tenant) {
        console.error('ERROR: Tenant "Keystone Infra Pvt Ltd" not found!');
        return;
    }

    const tid = tenant.id;
    console.log(`Tenant ID: ${tid}. Starting surgical cleanup...`);

    try {
        // 1. Transactional Data (Logs)
        console.log('Step 1: Clearing Attendance & Raw Logs...');
        await prisma.attendanceLog.deleteMany({ where: { tenantId: tid } });

        // Surgical Log Wipe: Get all devices first to ensure no orphans are left
        const devices = await prisma.device.findMany({ where: { tenantId: tid } });
        const dIds = devices.map(d => d.id);
        console.log(`Found ${dIds.length} devices. Cleaning their logs...`);

        await prisma.rawDeviceLog.deleteMany({ where: { deviceId: { in: dIds } } });
        await prisma.rawDeviceLog.deleteMany({ where: { tenantId: tid } });
        await prisma.deviceCommand.deleteMany({ where: { deviceId: { in: dIds } } });

        // 2. Financial & HR Data
        console.log('Step 2: Clearing Payroll, Payslips, Loans...');
        await prisma.loan.deleteMany({ where: { tenantId: tid } });
        await prisma.payslip.deleteMany({ where: { tenantId: tid } });
        await prisma.payroll.deleteMany({ where: { tenantId: tid } });
        await prisma.employeeSalaryComponent.deleteMany({ where: { tenantId: tid } });
        await prisma.employeeDocument.deleteMany({ where: { tenantId: tid } });

        // 3. Leave & Attendance Master
        console.log('Step 3: Clearing Leaves & Shifts...');
        await prisma.leaveBalance.deleteMany({ where: { tenantId: tid } });
        await prisma.leaveEntry.deleteMany({ where: { tenantId: tid } });
        await prisma.employeeShift.deleteMany({ where: { tenantId: tid } });
        await prisma.fieldLog.deleteMany({ where: { tenantId: tid } });

        // 4. Employee & User Records
        console.log('Step 4: Clearing Employees & System Users...');
        const emps = await prisma.employee.findMany({ where: { tenantId: tid }, select: { id: true } });
        const eIds = emps.map(e => e.id);

        await prisma.user.deleteMany({ where: { employeeId: { in: eIds } } });
        await prisma.employee.deleteMany({ where: { tenantId: tid } });

        // 5. Hardware & Master Structure
        console.log('Step 5: Clearing Devices & Orgz Structure...');
        await prisma.device.deleteMany({ where: { tenantId: tid } });
        await prisma.holiday.deleteMany({ where: { tenantId: tid } });
        await prisma.designation.deleteMany({ where: { tenantId: tid } });
        await prisma.department.deleteMany({ where: { tenantId: tid } });
        await prisma.branch.deleteMany({ where: { tenantId: tid } });
        await prisma.category.deleteMany({ where: { tenantId: tid } });
        await prisma.location.deleteMany({ where: { tenantId: tid } });
        await prisma.shift.deleteMany({ where: { tenantId: tid } });
        await prisma.syncLog.deleteMany({ where: { tenantId: tid } });

        console.log('--- KEYSTONE IS NOW 100% EMPTY ---');
    } catch (error) {
        console.error('NUKE FAILED:', error);
    }
}

nukeKeystone().finally(() => prisma.$disconnect());
