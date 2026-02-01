
import { prisma } from './src/config/database';

async function main() {
    const emailOrCode = process.argv[2];
    if (!emailOrCode) {
        console.log('Please provide employee code or email');
        return;
    }

    const employee = await prisma.employee.findFirst({
        where: {
            OR: [
                { employeeCode: emailOrCode },
                { email: emailOrCode },
                { firstName: { contains: emailOrCode } }
            ]
        }
    });

    if (!employee) {
        console.log('Employee not found');
        return;
    }

    console.log(`Checking logs for ${employee.firstName} ${employee.lastName} (${employee.employeeCode})...`);

    // Check Field Logs
    const fieldLogs = await prisma.fieldLog.findMany({
        where: { employeeId: employee.id },
        orderBy: { timestamp: 'desc' },
        take: 5
    });

    console.log('\n--- Recent Field Logs ---');
    fieldLogs.forEach(l => {
        console.log(`ID: ${l.id}, Time: ${l.timestamp.toISOString()}, Status: ${l.status}, Type: ${l.type}`);
    });

    // Check Attendance Logs
    const attLogs = await prisma.attendanceLog.findMany({
        where: { employeeId: employee.id },
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log('\n--- Recent Attendance Logs ---');
    attLogs.forEach(l => {
        console.log(`Date: ${l.date.toISOString()}, FirstIn: ${l.firstIn?.toISOString()}, LastOut: ${l.lastOut?.toISOString()}, Status: ${l.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
