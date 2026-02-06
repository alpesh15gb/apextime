import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserUpdates() {
    console.log('🕵️ Checking for recent User Name updates...');

    // 1. Check for Employees updated in last 10 mins
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    const updatedUsers = await prisma.user.findMany({
        where: {
            updatedAt: { gt: tenMinsAgo }
        },
        include: { employee: true },
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    console.log(`\n👥 Users updated in last 10 mins: ${updatedUsers.length}`);
    updatedUsers.forEach(u => {
        console.log(` - [${u.employee?.deviceUserId || '?'}] ${u.name} (Source: ${u.employee?.source || 'Unknown'})`);
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
}

checkUserUpdates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
