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

    // 1b. Create/Find Legacy Device
    let legacyDevice = await prisma.device.findFirst({
        where: { deviceId: 'LEGACY_IMPORT', tenantId: tenant.id }
    });

    if (!legacyDevice) {
        console.log('Creating virtual device for legacy import...');
        legacyDevice = await prisma.device.create({
            data: {
                tenantId: tenant.id,
                name: 'Legacy Import Device',
                deviceId: 'LEGACY_IMPORT',
                status: 'offline',
                ipAddress: '0.0.0.0',
                port: 0
            }
        });
    }
    console.log(`✅ Using Device: ${legacyDevice.name} (${legacyDevice.id})`);

    // 1c. CLEANUP: Delete previous import attempts to correct date format errors
    console.log('🧹 Clearing previous import data to ensure date accuracy...');
    const deleted = await prisma.rawDeviceLog.deleteMany({
        where: {
            deviceId: legacyDevice.id,
            tenantId: tenant.id
        }
    });
    console.log(`   Removed ${deleted.count} old records.`);


    // 2. Read File
    const filePath = path.resolve(process.cwd(), csvFile);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
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

        // Detect delimiter
        const delimiter = line.includes('\t') ? '\t' : ',';
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

        if (lineCount === 0) {
            console.log('Headers detected:', cols);
            lineCount++;
            continue;
        }

        // Mapping:
        // Index 2: UserId
        // Index 6: In/Out
        // Index 9: DateTime (MM/DD/YYYY H:MM) - CONFIRMED MM/DD

        if (cols.length < 10) { skippedCount++; continue; }

        const userId = cols[2];
        const punchTypeStr = cols[6];
        const dateTimeStr = cols[9];

        if (!userId || !dateTimeStr) { skippedCount++; continue; }

        const punchTime = parseDateTime(dateTimeStr);

        if (!punchTime) {
            console.warn(`[Line ${lineCount}] Invalid date format: ${dateTimeStr}`);
            skippedCount++;
            lineCount++;
            continue;
        }

        let punchType = '0'; // Default IN
        if (punchTypeStr && punchTypeStr.toLowerCase().includes('off')) punchType = '1';
        else if (punchTypeStr && punchTypeStr.toLowerCase().includes('out')) punchType = '1';

        try {
            await prisma.rawDeviceLog.create({
                data: {
                    tenantId: tenant.id,
                    deviceId: legacyDevice.id,
                    deviceUserId: userId,
                    userId: userId,
                    userName: cols[3],
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: punchType,
                    isProcessed: false
                }
            });
            importedCount++;
            if (importedCount % 100 === 0) process.stdout.write(`\rImported ${importedCount} records...`);
        } catch (e: any) {
            if (e.code !== 'P2002') console.error(`Error importing ${userId}:`, e.message);
        }

        lineCount++;
    }

    console.log(`\n\n✅ Import Complete.`);
    console.log(`   Total Lines: ${lineCount}`);
    console.log(`   Imported: ${importedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
}

// Helper: Parse MM/DD/YYYY HH:MM to Date (IST Aware)
function parseDateTime(str: string): Date | null {
    try {
        // Expected format: 1/31/2026 19:26 or 9/11/2025 8:25
        const [datePart, timePart] = str.split(' ');
        if (!datePart || !timePart) return null;

        const dateParts = datePart.split('/');
        let day, month, year;

        if (dateParts[0].length === 4) {
            // YYYY-MM-DD
            year = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]);
            day = parseInt(dateParts[2]);
        } else {
            // MM/DD/YYYY (US Format confirmed)
            month = parseInt(dateParts[0]); // First part is Month
            day = parseInt(dateParts[1]);   // Second part is Day
            year = parseInt(dateParts[2]);
        }

        // Basic validation
        if (month > 12) {
            // Maybe it WAS DD/MM? Swap fallback
            const temp = month; month = day; day = temp;
        }

        const [hour, minute] = timePart.split(':').map(n => parseInt(n));

        // Construct ISO string with IST Offset (+05:30)
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`;

        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return d;
    } catch (e) {
        return null;
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
