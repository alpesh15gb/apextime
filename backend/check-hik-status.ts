import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHik() {
    console.log('🔍 Checking for Linked Hikvision Devices...');

    // 1. Find Registered Devices
    const devices = await prisma.device.findMany({
        where: { protocol: { contains: 'HIK' } } // Look for HIKVISION_DIRECT or similar
    });

    console.log(`Found ${devices.length} Hikvision devices in DB:`);
    devices.forEach(d => {
        console.log(` - [${d.id}] ${d.deviceID} (${d.name}) | IP: ${d.ipAddress} | Status: ${d.status} | Last Seen: ${d.lastSeen}`);
    });

    // 2. Check for recent raw logs from Hikvision
    const recentLogs = await prisma.rawDeviceLog.findMany({
        where: {
            deviceId: { in: devices.map(d => d.id) }
        },
        orderBy: { timestamp: 'desc' },
        take: 3
    });

    if (recentLogs.length > 0) {
        console.log(`\n✅ Recent Logs received:`);
        recentLogs.forEach(l => console.log(` - User ${l.userId} at ${l.timestamp}`));
    } else {
        console.log('\n❌ No recent logs found from these devices.');
    }
}

checkHik()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
