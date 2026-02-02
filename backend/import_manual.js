const fs = require('fs');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV_FILE = './import.csv'; // Put your file here
const TENANT_NAME = 'Keystone Infra Pvt Ltd';

async function importLogs() {
    console.log(`Starting Import for ${TENANT_NAME}...`);

    const tenant = await prisma.tenant.findFirst({
        where: { name: TENANT_NAME }
    });

    if (!tenant) {
        console.error('Tenant not found!');
        return;
    }

    // Find the ADMS Device to link logs to
    const device = await prisma.device.findFirst({
        where: { tenantId: tenant.id, protocol: 'ESSL_ADMS' }
    });

    if (!device) {
        console.error('No ADMS Device found to attach logs to. Please add one first.');
        return;
    }

    console.log(`Attaching logs to Device: ${device.name} (${device.deviceId})`);

    if (!fs.existsSync(CSV_FILE)) {
        console.error(`File ${CSV_FILE} not found. Please create it first.`);
        console.log('Format: EmployeeID, YYYY-MM-DD, HH:mm');
        return;
    }

    const fileStream = fs.createReadStream(CSV_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        if (!line.trim() || line.toLowerCase().includes('employeeid')) continue; // Skip header/empty

        const parts = line.split(',');
        if (parts.length < 3) continue;

        const userId = parts[0].trim();
        const dateStr = parts[1].trim(); // YYYY-MM-DD
        const timeStr = parts[2].trim(); // HH:mm

        // Combine to Date Object (Force IST +5.5 logic if needed, but usually input is local)
        // Here we assume input "2026-01-01 09:30" is ALREADY accurate local time.
        // We parse it as such.
        const dateTimeStr = `${dateStr}T${timeStr}:00+05:30`;
        const punchTime = new Date(dateTimeStr);

        if (isNaN(punchTime.getTime())) {
            console.log(`Invalid Date for ${userId}: ${dateTimeStr}`);
            continue;
        }

        const uniqueId = `MANUAL_${userId}_${punchTime.getTime()}`;

        // Auto-Create Employee if missing (Same logic as ADMS)
        let emp = await prisma.employee.findFirst({ where: { tenantId: tenant.id, deviceUserId: userId } });
        if (!emp) {
            console.log(`Creating Auto-User: ${userId}`);
            const defaultShift = await prisma.shift.findFirst({ where: { tenantId: tenant.id, code: 'GS' } });
            await prisma.employee.create({
                data: {
                    tenantId: tenant.id, firstName: `Auto-User ${userId}`, lastName: '(Manual)',
                    employeeCode: userId, deviceUserId: userId, gender: 'Male',
                    dateOfJoining: new Date(), shiftId: defaultShift?.id
                }
            });
        }

        try {
            await prisma.rawDeviceLog.upsert({
                where: { id: uniqueId },
                update: {},
                create: {
                    id: uniqueId,
                    tenantId: tenant.id,
                    deviceId: device.id,
                    userId: userId,
                    deviceUserId: userId,
                    userName: emp ? emp.firstName : `Unknown ${userId}`,
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: '0',
                    isProcessed: false // This triggers the system to re-calculate attendance
                }
            });
            count++;
            if (count % 100 === 0) console.log(`Processed ${count} logs...`);
        } catch (e) {
            console.error(`Error saving ${userId}: ${e.message}`);
        }
    }

    console.log(`✅ IMPORT COMPLETE. Total Logs: ${count}`);
    console.log(`The system will now process these logs in the background.`);
}

importLogs().finally(() => prisma.$disconnect());
