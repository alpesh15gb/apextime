const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete all USB imported attendance logs
 * Run this before re-importing with the fixed script
 */

async function deleteUSBImports() {
    console.log('🗑️  Deleting all USB imported attendance logs...\n');

    const result = await prisma.attendanceLog.deleteMany({
        where: {
            rawData: {
                contains: 'USB Import'
            }
        }
    });

    console.log(`✅ Deleted ${result.count} USB imported logs\n`);
    console.log('Now you can re-run the import script with the correct timezone handling.');

    await prisma.$disconnect();
}

deleteUSBImports()
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
