import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('🧹 REPAIRING EMPLOYEE MAPPINGS...');

    // 1. Get all "Auto-Users"
    const autoUsers = await prisma.employee.findMany({
        where: {
            OR: [
                { firstName: { startsWith: 'Auto-User' } },
                { lastName: { contains: 'Manual' } }
            ]
        }
    });

    console.log(`Found ${autoUsers.length} Auto-Users to potentially merge.`);

    // 2. Get all "Real" employees
    const realEmployees = await prisma.employee.findMany({
        where: {
            NOT: {
                firstName: { startsWith: 'Auto-User' }
            }
        }
    });

    console.log(`Found ${realEmployees.length} Real employees in database.`);

    let fixedCount = 0;

    for (const auto of autoUsers) {
        // Extract number from HO015 -> 15
        const id = auto.deviceUserId || auto.employeeCode;
        if (!id) continue;

        const numericPart = id.replace(/\D/g, '').replace(/^0+/, '');
        if (!numericPart) continue;

        // Try to find a real employee with matching numeric code
        const target = realEmployees.find(e => {
            const eCode = e.employeeCode.replace(/\D/g, '').replace(/^0+/, '');
            const sCode = (e.sourceEmployeeId || '').replace(/\D/g, '').replace(/^0+/, '');
            return eCode === numericPart || sCode === numericPart;
        });

        if (target && target.id !== auto.id) {
            console.log(`🔗 Linking ${id} to Real Employee: ${target.firstName} ${target.lastName || ''} (${target.employeeCode})`);

            // Update the real employee to have this deviceUserId
            await prisma.employee.update({
                where: { id: target.id },
                data: { deviceUserId: id }
            });

            // Delete the auto-user to clear the report
            try {
                // First delete its attendance logs to avoid constraint issues
                await prisma.attendanceLog.deleteMany({ where: { employeeId: auto.id } });
                await prisma.employee.delete({ where: { id: auto.id } });
                console.log(`   ✅ Merged and deleted duplicate Auto-User record.`);
            } catch (err) {
                console.log(`   ⚠️ Could not delete auto-user (may have dependencies), but mapping is updated.`);
            }

            fixedCount++;
        }
    }

    console.log(`\n🎉 REPAIR FINISHED. Linked ${fixedCount} employees.`);
    console.log(`\n🚀 NEXT STEP: Run the reprocess script again to update the report with real names:`);
    console.log(`docker exec -it apextime-backend npx ts-node reprocess-jan.ts`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
