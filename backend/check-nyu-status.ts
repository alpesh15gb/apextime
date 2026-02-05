import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
    console.log('📊 CHECKING NYU DATA PULL STATUS...\n');

    // 1. Check the command status
    const commands = await prisma.deviceCommand.findMany({
        where: {
            device: { deviceId: 'NYU7254300525' },
            commandType: 'DATA'
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log(`📋 Recent DATA Commands (Last 5):`);
    commands.forEach(cmd => {
        console.log(`   - ${cmd.status} | Created: ${cmd.createdAt.toLocaleString()} | Completed: ${cmd.completedAt?.toLocaleString() || 'N/A'}`);
    });

    // 2. Check raw logs count
    const totalLogs = await prisma.rawDeviceLog.count({
        where: {
            device: { deviceId: 'NYU7254300525' }
        }
    });

    const recentLogs = await prisma.rawDeviceLog.count({
        where: {
            device: { deviceId: 'NYU7254300525' },
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        }
    });

    console.log(`\n📊 NYU Log Statistics:`);
    console.log(`   - Total Logs in DB: ${totalLogs}`);
    console.log(`   - Logs in Last 5 Minutes: ${recentLogs}`);

    if (recentLogs > 0) {
        console.log(`\n✅ SUCCESS! NYU is actively sending data.`);

        const latestLog = await prisma.rawDeviceLog.findFirst({
            where: { device: { deviceId: 'NYU7254300525' } },
            orderBy: { punchTime: 'desc' }
        });

        if (latestLog) {
            console.log(`   Latest punch: ${latestLog.deviceUserId} at ${latestLog.punchTime.toLocaleString()}`);
        }
    } else {
        console.log(`\n⏳ Waiting for NYU to check in and start uploading...`);
        console.log(`   The machine checks in every 1-2 minutes. Run this script again in a minute.`);
    }
}

checkStatus()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
