import fs from 'fs';
import readline from 'readline';
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Initialize Prisma
const prisma = new PrismaClient();

async function main() {
    const tenantCode = 'pewec';
    const csvFile = 'attendance.csv'; // Must be in same directory or root

    console.log(`Starting import for tenant: ${tenantCode}...`);

    // 1. Find Tenant
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { code: tenantCode },
                { name: { contains: 'Princess', mode: 'insensitive' } }
            ]
        }
    });

    if (!tenant) {
        console.error(`❌ Tenant '${tenantCode}' not found.`);
        process.exit(1);
    }

    console.log(`✅ Found Tenant: ${tenant.name} (${tenant.id})`);

    // 1b. Create/Find Legacy Device (Required for Foreign Key)
    let legacyDevice = await prisma.device.findFirst({
        where: { deviceId: 'LEGACY_IMPORT', tenantId: tenant.id }
    });

    if (!legacyDevice) {
        console.log('Creating virtual device for legacy import...');
        legacyDevice = await prisma.device.create({
            data: {
                tenantId: tenant.id,
                name: 'Legacy Import Device',
                deviceId: 'LEGACY_IMPORT', // The logical ID
                status: 'offline',
                ipAddress: '0.0.0.0',
                port: 0
            }
        });
    }
    console.log(`✅ Using Device: ${legacyDevice.name} (${legacyDevice.id})`);


    // 2. Read File
    const filePath = path.resolve(process.cwd(), csvFile);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.error(`   Please create a file named 'attendance.csv' in the current folder.`);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineCount = 0;
    let importedCount = 0;
    let skippedCount = 0;

    console.log('Reading CSV...');

    for await (const line of rl) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Detect delimiter (Tab or Comma)
        const delimiter = line.includes('\t') ? '\t' : ',';
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '')); // Trim quotes

        // Assumption: Header row is first line
        if (lineCount === 0) {
            console.log('Headers detected:', cols);
            // Optional: Verify columns
            lineCount++;
            continue;
        }

        // Mapping based on your screenshot:
        // Index 2: EnNo (User ID)
        // Index 6: In/Out (DutyOn/DutyOff)
        // Index 9: DateTime (9/11/2025 8:25)

        // Safety check bounds
        if (cols.length < 10) {
            skippedCount++;
            continue;
        }

        const userId = cols[2];
        const punchTypeStr = cols[6]; // DutyOn / DutyOff
        const dateTimeStr = cols[9];

        if (!userId || !dateTimeStr) {
            skippedCount++;
            continue;
        }

        // Parse Date: DD/MM/YYYY HH:mm
        const punchTime = parseDateTime(dateTimeStr);

        if (!punchTime) {
            console.warn(`[Line ${lineCount}] Invalid date format: ${dateTimeStr}`);
            skippedCount++;
            lineCount++;
            continue;
        }

        // Determine In/Out (0=IN, 1=OUT)
        // "DutyOn" -> IN, "DutyOff" -> OUT. Default to IN (0) if unsure but record the string
        let punchType = '0'; // Default IN
        if (punchTypeStr && punchTypeStr.toLowerCase().includes('off')) {
            punchType = '1';
        } else if (punchTypeStr && punchTypeStr.toLowerCase().includes('out')) {
            punchType = '1';
        }

        try {
            await prisma.rawDeviceLog.create({
                data: {
                    tenantId: tenant.id,
                    deviceId: legacyDevice.id, // MUST be the UUID of the device row
                    deviceUserId: userId,
                    userId: userId, // Duplicate for safety
                    userName: cols[3], // Name is usually col 3
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: punchType,
                    isProcessed: false // Will be picked up by calculation service
                }
            });
            importedCount++;
            if (importedCount % 100 === 0) process.stdout.write(`\rImported ${importedCount} records...`);
        } catch (e: any) {
            // Ignore duplicate key errors (P2002)
            if (e.code !== 'P2002') {
                console.error(`Error importing ${userId} at ${dateTimeStr}:`, e.message);
            }
        }

        lineCount++;
    }

    console.log(`\n\n✅ Import Complete.`);
    console.log(`   Total Lines: ${lineCount}`);
    console.log(`   Imported: ${importedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`\nRun the "Recalculate Attendance" from the dashboard to update reports.`);
}

// Helper: Parse DD/MM/YYYY HH:MM to Date (IST Aware)
function parseDateTime(str: string): Date | null {
    try {
        // Expected format: 9/11/2025 8:25
        const [datePart, timePart] = str.split(' ');
        if (!datePart || !timePart) return null;

        const dateParts = datePart.split('/'); // [D, M, Y] or [M, D, Y]
        // Assuming DD/MM/YYYY based on India context
        let day, month, year;

        if (dateParts[0].length === 4) {
            // YYYY/MM/DD
            year = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]);
            day = parseInt(dateParts[2]);
        } else {
            // DD/MM/YYYY
            day = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]);
            year = parseInt(dateParts[2]);
        }

        const [hour, minute] = timePart.split(':').map(n => parseInt(n));

        // Construct ISO string with IST Offset (+05:30) to ensure absolute time correctness
        // YYYY-MM-DDTHH:mm:00+05:30
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`;

        return new Date(iso);
    } catch (e) {
        return null;
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
