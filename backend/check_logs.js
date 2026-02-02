
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.rawDeviceLog.findMany({
        orderBy: { punchTime: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(logs, null, 2));

    const employees = await prisma.employee.findMany({
        take: 5
    });
    console.log('--- SAMPLE EMPLOYEES ---');
    console.log(JSON.stringify(employees, null, 2));
}

main();
