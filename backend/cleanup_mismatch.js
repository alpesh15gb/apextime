
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupMismatchedAttendance() {
    console.log('Searching for attendance records dated before employee joining date...');

    // Fetch all employees with a joining date
    const employees = await prisma.employee.findMany({
        where: {
            dateOfJoining: { not: null }
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            dateOfJoining: true
        }
    });

    let totalDeleted = 0;

    for (const emp of employees) {
        // Start of joining day
        const joiningDate = new Date(emp.dateOfJoining);
        joiningDate.setHours(0, 0, 0, 0);

        // Find attendance records BEFORE joining date
        const result = await prisma.attendanceLog.deleteMany({
            where: {
                employeeId: emp.id,
                date: { lt: joiningDate }
            }
        });

        if (result.count > 0) {
            console.log(`Deleted ${result.count} incorrect attendance records for ${emp.firstName} ${emp.lastName} (Joined on ${emp.dateOfJoining.toISOString().split('T')[0]})`);
            totalDeleted += result.count;
        }
    }

    console.log(`\nDONE: Deleted ${totalDeleted} historical records that belonged to previous owners of device IDs.`);
}

cleanupMismatchedAttendance().finally(() => prisma.$disconnect());
