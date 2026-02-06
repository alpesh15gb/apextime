import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserUpdates() {
    console.log('🕵️ Checking for recent User Name updates...');

    // 1. Check for Employees updated in last 10 mins
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    const updatedEmployees = await prisma.employee.findMany({
        where: {
            updatedAt: { gt: tenMinsAgo }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    console.log(`\n👥 Employees updated in last 10 mins: ${updatedEmployees.length}`);
    updatedEmployees.forEach(e => {
        console.log(` - [${e.deviceUserId || '?'}] ${e.firstName} ${e.lastName || ''} (Code: ${e.employeeCode})`);
    });

    // 2. Check for fulfilled commands
    const completedCommands = await prisma.deviceCommand.findMany({
        where: {
            commandType: 'DATA QUERY USERINFO',
            status: { in: ['COMPLETED', 'SENT', 'SUCCESS'] }, // Check various status values
            updatedAt: { gt: tenMinsAgo }
        }
    });

    console.log(`\n✅ Completed Commands: ${completedCommands.length}`);
    completedCommands.forEach(c => {
        console.log(` - Device ${c.deviceId}: ${c.status} at ${c.updatedAt}`);
    });

    // 3. INVESTIGATE DUPLICATES for YLR668
    const duplicates = await prisma.employee.findMany({
        where: {
            OR: [
                { deviceUserId: 'YLR668' },
                { employeeCode: { contains: 'YLR668' } }
            ]
        }
    });
    console.log(`\n🕵️ Entries for YLR668: ${duplicates.length}`);
    duplicates.forEach(d => {
        console.log(` - ID: ${d.id} | Code: ${d.employeeCode} | Name: ${d.firstName} ${d.lastName || ''} | DevID: ${d.deviceUserId}`);
    });
}

checkUserUpdates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
