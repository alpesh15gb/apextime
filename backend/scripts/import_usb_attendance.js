const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Import attendance data from USB .dat file
 * Format: [EmployeeID] [Timestamp] [1] [255] [PunchType] [0]
 * PunchType: 1 = IN, 15 = OUT
 */

async function importUSBAttendance(filePath, tenantId) {
    console.log('🚀 Starting USB Attendance Import...');
    console.log(`📁 File: ${filePath}`);
    console.log(`🏢 Tenant: ${tenantId}\n`);

    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    console.log(`📊 Total lines: ${lines.length}\n`);

    // Parse the data
    const punches = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by tab or multiple spaces
        const parts = line.split(/\s+/);

        if (parts.length < 6) {
            errors.push({ line: i + 1, reason: 'Invalid format', data: line });
            continue;
        }

        const [deviceUserId, timestamp, , , punchType] = parts;

        punches.push({
            deviceUserId: deviceUserId.trim(),
            timestamp: timestamp.trim(),
            punchType: punchType === '1' ? 'IN' : 'OUT',
            lineNumber: i + 1
        });
    }

    console.log(`✅ Parsed ${punches.length} punches`);
    console.log(`❌ Errors: ${errors.length}\n`);

    if (errors.length > 0) {
        console.log('⚠️  First 5 errors:');
        errors.slice(0, 5).forEach(err => {
            console.log(`   Line ${err.line}: ${err.reason} - ${err.data}`);
        });
        console.log('');
    }

    // Get all employees for this tenant
    const employees = await prisma.employee.findMany({
        where: { tenantId },
        select: {
            id: true,
            deviceUserId: true,
            name: true
        }
    });

    console.log(`👥 Found ${employees.length} employees in database\n`);

    // Create a map of deviceUserId to employeeId
    const employeeMap = new Map();
    employees.forEach(emp => {
        if (emp.deviceUserId) {
            // Store multiple variations
            employeeMap.set(emp.deviceUserId, emp);
            employeeMap.set(emp.deviceUserId.toUpperCase(), emp);
            // Remove leading zeros
            employeeMap.set(emp.deviceUserId.replace(/^0+/, ''), emp);
        }
    });

    // Process punches
    let imported = 0;
    let skipped = 0;
    let unmapped = new Set();

    console.log('🔄 Importing punches...\n');

    for (const punch of punches) {
        // Try to find employee
        let employee = employeeMap.get(punch.deviceUserId);

        if (!employee) {
            // Try uppercase
            employee = employeeMap.get(punch.deviceUserId.toUpperCase());
        }

        if (!employee) {
            // Try without leading zeros
            const withoutZeros = punch.deviceUserId.replace(/^0+/, '');
            employee = employeeMap.get(withoutZeros);
        }

        if (!employee) {
            unmapped.add(punch.deviceUserId);
            skipped++;
            continue;
        }

        // Parse timestamp (format: YYYY-MM-DD HH:MM:SS)
        const punchTime = new Date(punch.timestamp + '+05:30'); // IST

        try {
            // Check if this punch already exists
            const existing = await prisma.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    punchTime: punchTime
                }
            });

            if (existing) {
                skipped++;
                continue;
            }

            // Create attendance record
            await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    tenantId: tenantId,
                    punchTime: punchTime,
                    punchType: punch.punchType,
                    source: 'USB_IMPORT',
                    deviceId: null, // No device for USB imports
                    latitude: null,
                    longitude: null
                }
            });

            imported++;

            if (imported % 100 === 0) {
                console.log(`   Imported ${imported} punches...`);
            }
        } catch (error) {
            console.error(`❌ Error importing punch for ${punch.deviceUserId}:`, error.message);
            skipped++;
        }
    }

    console.log('\n✅ Import Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total Punches: ${punches.length}`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipped - unmapped.size}`);
    console.log(`   ❌ Unmapped IDs: ${unmapped.size}`);

    if (unmapped.size > 0) {
        console.log('\n⚠️  Unmapped Employee IDs:');
        const unmappedArray = Array.from(unmapped).slice(0, 20);
        unmappedArray.forEach(id => {
            console.log(`   - ${id}`);
        });
        if (unmapped.size > 20) {
            console.log(`   ... and ${unmapped.size - 20} more`);
        }
    }

    await prisma.$disconnect();
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('Usage: node import_usb_attendance.js <file_path> <tenant_id>');
    console.log('Example: node import_usb_attendance.js ./attendance.dat 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
}

const [filePath, tenantId] = args;

if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
}

importUSBAttendance(filePath, tenantId)
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
