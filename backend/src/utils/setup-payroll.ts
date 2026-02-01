import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Initializing Payroll Compliance Data ---');

    // Create standard Leave Types
    const leaveTypes = [
        { name: 'Paid Leave', code: 'PL', isPaid: true, description: 'Standard annual leave' },
        { name: 'Sick Leave', code: 'SL', isPaid: true, description: 'Medical leaves' },
        { name: 'Unpaid Leave (LOP)', code: 'LOP', isPaid: false, description: 'Loss of Pay absences' }
    ];

    const defaultTenant = await prisma.tenant.findFirst({ where: { slug: 'apextime' } });
    if (!defaultTenant) throw new Error('Default tenant not found. Please run seed first.');

    for (const lt of leaveTypes) {
        await prisma.leaveType.upsert({
            where: { code_tenantId: { code: lt.code, tenantId: defaultTenant.id } },
            update: { ...lt, tenantId: defaultTenant.id },
            create: { ...lt, tenantId: defaultTenant.id }
        });
        console.log(`✓ Leave Type: ${lt.name} (${lt.code})`);
    }

    console.log('--- Setup Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
