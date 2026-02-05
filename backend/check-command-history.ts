import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHistory() {
    console.log('📜 CHECKING NYU COMMAND HISTORY...\n');

    const device = await prisma.device.findFirst({
        where: { deviceId: 'NYU7254300525' }
    });

    if (!device) {
        console.error('❌ Device not found');
        return;
    }

    // Get ALL commands ever sent to this device
    const allCommands = await prisma.deviceCommand.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    console.log(`📋 Last 20 Commands for NYU7254300525:\n`);

    if (allCommands.length === 0) {
        console.log('   No commands found in history.');
    } else {
        allCommands.forEach((cmd, idx) => {
            console.log(`${idx + 1}. Type: ${cmd.commandType} | Status: ${cmd.status}`);
            console.log(`   Payload: ${cmd.payload || 'N/A'}`);
            console.log(`   Created: ${cmd.createdAt.toLocaleString()}`);
            console.log(`   Sent: ${cmd.sentAt?.toLocaleString() || 'N/A'}`);
            console.log(`   Completed: ${cmd.completedAt?.toLocaleString() || 'N/A'}`);
            console.log('');
        });
    }

    // Check if device is online
    console.log(`\n📡 Device Status:`);
    console.log(`   Status: ${device.status}`);
    console.log(`   Last Seen: ${device.lastSeen?.toLocaleString() || 'Never'}`);
}

checkHistory()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
