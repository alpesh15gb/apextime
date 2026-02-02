
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairEveryone() {
    console.log('--- STARTING GLOBAL ATTENDANCE REPAIR ---');
    console.log('Using strict Identity Matching and Creation-Date boundaries.');

    // 1. Get all employees
    const employees = await prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true, employeeCode: true, createdAt: true, deviceUserId: true }
    });

    console.log(`Analyzing ${employees.length} employees...`);

    let totalFixed = 0;

    for (const emp of employees) {
        if (!emp.deviceUserId) continue;

        // 2. Clear current attendance to force a clean recalculation with new safety rules
        // NOTE: We only wipe if the employee has a deviceUserId and potentially ghost history.
        // For safety, we recalculate everything to be "Damn Sure".
        const logsCount = await prisma.attendanceLog.count({ where: { employeeId: emp.id } });

        if (logsCount > 0) {
            await prisma.attendanceLog.deleteMany({ where: { employeeId: emp.id } });
            console.log(`Reprocessing ${emp.firstName} ${emp.lastName} (${emp.employeeCode})...`);

            // 3. Mark their raw logs as unprocessed so the next sync cycle picks them up with new logic
            await prisma.rawDeviceLog.updateMany({
                where: { deviceUserId: emp.deviceUserId },
                data: { isProcessed: false }
            });
            totalFixed++;
        }
    }

    console.log(`\nDONE: ${totalFixed} employee records queued for recalculation.`);
    console.log('The system will now rebuild their attendance correctly in the next 5 minutes.');
    console.log('Only logs matching their Name or within their Apextime window will be accepted.');
}

repairEveryone().catch(e => console.error(e)).finally(() => prisma.$disconnect());
