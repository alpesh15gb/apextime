import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const allModules = [
        'attendance', 'leaves', 'employees', 'payroll', 'reports',
        'projects', 'devices', 'field_logs', 'recruitment',
        'performance', 'expenses', 'training', 'helpdesk',
        'visitors', 'onboarding'
    ];

    const tenants = await prisma.tenant.updateMany({
        data: {
            modules: {
                set: allModules
            }
        }
    });

    console.log(`Updated ${tenants.count} tenants with all modules.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
