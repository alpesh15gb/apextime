
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const empCount = await prisma.employee.count();
    const withDeviceCount = await prisma.employee.count({ where: { deviceUserId: { not: null } } });
    const genericNames = await prisma.employee.count({
        where: {
            OR: [
                { firstName: 'Employee' },
                { firstName: { startsWith: 'User' } }
            ]
        }
    });

    console.log(`Total Employees: ${empCount}`);
    console.log(`Linked to Device: ${withDeviceCount}`);
    console.log(`Generic Names (Employee/User): ${genericNames}`);

    const sampleUnprocessed = await prisma.rawDeviceLog.findMany({
        where: { isProcessed: false },
        take: 10
    });
    console.log('--- SAMPLE UNPROCESSED LOGS (Missing Employee Mapping) ---');
    console.log(JSON.stringify(sampleUnprocessed, null, 2));

    const sampleEmployees = await prisma.employee.findMany({
        where: {
            OR: [
                { firstName: 'Employee' },
                { firstName: { startsWith: 'User' } }
            ]
        },
        take: 5
    });
    console.log('--- SAMPLE GENERIC EMPLOYEES ---');
    console.log(JSON.stringify(sampleEmployees, null, 2));
}

main();
