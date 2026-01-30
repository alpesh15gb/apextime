
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeEmpPrefix() {
    console.log('Starting migration to remove EMP prefix from Employee Codes...');

    try {
        const employees = await prisma.employee.findMany({
            where: {
                employeeCode: {
                    startsWith: 'EMP'
                }
            }
        });

        console.log(`Found ${employees.length} employees with EMP prefix.`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const emp of employees) {
            // Logic: EMP0042 -> 42 (remove EMP, remove leading zeros if deviceUserId was used)
            // Or safer: use deviceUserId if available, otherwise strip EMP.

            let newCode = emp.employeeCode.replace(/^EMP/, '');

            // If the code was padded with zeros (e.g. EMP0042) but the deviceUserId is just "42",
            // we usually prefer "42". 
            if (emp.deviceUserId) {
                newCode = emp.deviceUserId;
            } else {
                // Trim leading zeros if it looks like a number
                if (/^\d+$/.test(newCode)) {
                    newCode = parseInt(newCode, 10).toString();
                }
            }

            if (newCode === emp.employeeCode) {
                console.log(`Skipping ${emp.employeeCode} (no change)`);
                continue;
            }

            console.log(`Migrating: ${emp.employeeCode} -> ${newCode}`);

            try {
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: { employeeCode: newCode }
                });
                updatedCount++;
            } catch (error) {
                console.error(`Failed to update ${emp.employeeCode}:`, error);
                errorCount++;
            }
        }

        console.log(`Migration complete.`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

removeEmpPrefix();
