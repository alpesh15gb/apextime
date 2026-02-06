const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany();
    console.log('Available Tenants:', tenants.map(t => ({ id: t.id, name: t.name, code: t.companyCode })));

    const tenant = tenants[0]; // Assuming first for now, but better to check them all
    if (!tenant) return;

    const employeeCount = await prisma.employee.count({ where: { tenantId: tenant.id } });
    console.log(`\nTenant ${tenant.name} has ${employeeCount} employees.`);

    const sampleEmp = await prisma.employee.findFirst({ where: { tenantId: tenant.id } });
    console.log('Sample Employee:', sampleEmp.firstName, sampleEmp.employeeCode);

    const logs = await prisma.attendanceLog.findMany({
        where: {
            tenantId: tenant.id,
            date: {
                gte: new Date('2026-02-01T00:00:00Z')
            }
        },
        include: { employee: true },
        orderBy: { date: 'desc' }
    });

    console.log(`\nFound ${logs.length} logs for this tenant in February:`);
    logs.forEach(l => {
        console.log(`- Emp: ${l.employee.firstName}, Date: ${l.date.toISOString()}, Status: ${l.status}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
