import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHikNames() {
    console.log('🔧 Fixing HIK_ prefixed names...');

    const badEmployees = await prisma.employee.findMany({
        where: {
            employeeCode: { startsWith: 'HIK_' }
        }
    });

    console.log(`Found ${badEmployees.length} employees with HIK_ prefix.`);

    for (const emp of badEmployees) {
        const newCode = emp.employeeCode.replace('HIK_', '');
        console.log(` - Renaming ${emp.employeeCode} -> ${newCode}`);

        try {
            await prisma.employee.update({
                where: { id: emp.id },
                data: { employeeCode: newCode }
            });
            console.log('   ✅ Success');
        } catch (e) {
            console.error('   ❌ Failed (Maybe ID conflict?)', e);
        }
    }
}

fixHikNames()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
