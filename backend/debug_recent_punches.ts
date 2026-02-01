
import { prisma } from './src/config/database';

async function main() {
    console.log('Checking recent approved field punches...');

    const recent = await prisma.fieldLog.findFirst({
        where: { status: 'approved' },
        orderBy: { approvedAt: 'desc' },
        include: { employee: true }
    });

    if (!recent) {
        console.log('No recently approved punches found.');
        return;
    }

    console.log(`Most recent approved punch: ${recent.type} at ${recent.timestamp.toISOString()} by ${recent.employee.firstName} (ID: ${recent.employee.employeeCode})`);
    console.log(`Approved At: ${recent.approvedAt?.toISOString()}`);

    // Check Attendance Log for this day
    const date = new Date(recent.timestamp);
    // date.setHours(0,0,0,0); // This depends on TZ

    console.log(`\nSearching Attendance Logs for Employee ${recent.employee.employeeCode} around ${recent.timestamp.toISOString()}...`);

    const logs = await prisma.attendanceLog.findMany({
        where: {
            employeeId: recent.employeeId
        },
        orderBy: { date: 'desc' },
        take: 5
    });

    logs.forEach(l => {
        console.log(`[AttLog] Date: ${l.date.toISOString()} | FirstIn: ${l.firstIn?.toISOString()} | Status: ${l.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
