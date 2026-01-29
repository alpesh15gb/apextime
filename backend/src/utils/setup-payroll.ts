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

    for (const lt of leaveTypes) {
        await prisma.leaveType.upsert({
            where: { code: lt.code },
            update: lt,
            create: lt
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
