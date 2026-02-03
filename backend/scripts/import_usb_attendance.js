const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Import attendance data from USB .dat file
 * Format: [EmployeeID] [Date] [Time] [1] [255] [PunchType] [0]
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

        if (parts.length < 7) {
            errors.push({ line: i + 1, reason: 'Invalid format', data: line });
            continue;
        }

        // Format: [deviceUserId] [date] [time] [1] [255] [punchType] [0]
        const deviceUserId = parts[0];
        const date = parts[1];
        const time = parts[2];
        const punchType = parts[5];

        punches.push({
            deviceUserId: deviceUserId.trim(),
            timestamp: `${date} ${time}`,
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
            firstName: true,
            lastName: true
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

    // Process punches - group by employee and date
    let imported = 0;
    let skipped = 0;
    let unmapped = new Set();
    const punchMap = new Map();

    console.log('🔄 Processing punches...\n');

    for (const punch of punches) {
        // Try to find employee
        let employee = employeeMap.get(punch.deviceUserId);

        if (!employee) {
            employee = employeeMap.get(punch.deviceUserId.toUpperCase());
        }

        if (!employee) {
            const withoutZeros = punch.deviceUserId.replace(/^0+/, '');
            employee = employeeMap.get(withoutZeros);
        }

        if (!employee) {
            unmapped.add(punch.deviceUserId);
            skipped++;
            continue;
        }

        // Parse timestamp - treat as UTC (which represents IST time)
        let punchTime;
        try {
            const timestampStr = punch.timestamp.trim();
            let dateStr, timeStr;

            if (timestampStr.includes(' ')) {
                [dateStr, timeStr] = timestampStr.split(' ');
            } else {
                dateStr = timestampStr.substring(0, 10);
                timeStr = timestampStr.substring(10);
            }

            // Parse as UTC directly - the times in the file are already IST
            // We store them as UTC in the database (standard practice)
            const isoString = `${dateStr}T${timeStr}.000Z`;
            punchTime = new Date(isoString);

            if (isNaN(punchTime.getTime())) {
                console.error(`⚠️  Invalid timestamp for ${punch.deviceUserId}: ${punch.timestamp}`);
                skipped++;
                continue;
            }
        } catch (error) {
            console.error(`⚠️  Error parsing timestamp for ${punch.deviceUserId}: ${punch.timestamp}`);
            skipped++;
            continue;
        }

        // Get date only (YYYY-MM-DD) from the original timestamp
        const dateOnly = punch.timestamp.split(' ')[0];
        const key = `${employee.id}_${dateOnly}`;

        if (!punchMap.has(key)) {
            punchMap.set(key, {
                employeeId: employee.id,
                date: new Date(dateOnly + 'T00:00:00.000Z'),
                punches: []
            });
        }

        punchMap.get(key).punches.push({
            time: punchTime,
            type: punch.punchType
        });
    }

    console.log(`📅 Grouped into ${punchMap.size} employee-days\n`);
    console.log('🔄 Creating attendance logs...\n');

    // Process each employee-day
    for (const [key, data] of punchMap) {
        try {
            // Sort punches by time
            data.punches.sort((a, b) => a.time - b.time);

            const firstIn = data.punches.find(p => p.type === 'IN')?.time || data.punches[0].time;
            const lastOut = data.punches.slice().reverse().find(p => p.type === 'OUT')?.time || data.punches[data.punches.length - 1].time;

            // Calculate total hours
            const totalHours = lastOut && firstIn ? (lastOut - firstIn) / (1000 * 60 * 60) : 0;

            // Check if log already exists
            const existing = await prisma.attendanceLog.findFirst({
                where: {
                    employeeId: data.employeeId,
                    date: data.date,
                    tenantId: tenantId
                }
            });

            if (existing) {
                skipped++;
                continue;
            }

            // Create attendance log
            await prisma.attendanceLog.create({
                data: {
                    employeeId: data.employeeId,
                    tenantId: tenantId,
                    date: data.date,
                    firstIn: firstIn,
                    lastOut: lastOut,
                    totalHours: totalHours,
                    workingHours: totalHours,
                    lateArrival: 0,
                    earlyDeparture: 0,
                    status: 'Present',
                    logs: JSON.stringify(data.punches.map(p => ({
                        time: p.time.toISOString(),
                        type: p.type
                    }))),
                    totalPunches: data.punches.length,
                    rawData: `USB Import - ${data.punches.length} punches`
                }
            });

            imported++;

            if (imported % 10 === 0) {
                console.log(`   Created ${imported} attendance logs...`);
            }
        } catch (error) {
            console.error(`❌ Error creating log for ${key}:`, error.message);
            skipped++;
        }
    }

    console.log('\n✅ Import Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total Punches: ${punches.length}`);
    console.log(`   📅 Employee-Days Created: ${imported}`);
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
