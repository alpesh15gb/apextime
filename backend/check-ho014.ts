import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeData() {
    const code = 'HO014';
    console.log(`🔍 Checking data for employee ${code}...`);

    const employee = await prisma.employee.findFirst({
        where: { employeeCode: code },
        include: {
            salaryComponents: true,
            _count: {
                select: { attendanceLogs: true }
            }
        }
    });

    if (employee) {
        console.log(`
        Name: ${employee.firstName} ${employee.lastName}
        DOJ: ${employee.dateOfJoining}
        CTC: ${employee.monthlyCtc}
        Components Count: ${employee.salaryComponents.length}
        Attendance Logs Count: ${employee._count.attendanceLogs}
        Status: ${employee.status}
        `);

        // Check logs for January
        const janLogs = await prisma.attendanceLog.count({
            where: {
                employeeId: employee.id,
                date: {
                    gte: new Date('2026-01-01'),
                    lte: new Date('2026-01-31')
                }
            }
        });
        console.log(`January 2026 Logs: ${janLogs}`);

    } else {
        console.log('Employee not found.');
    }
}

checkEmployeeData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
