import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJanuaryData() {
  try {
    // Check January 2026 attendance logs
    const januaryLogs = await prisma.attendanceLog.findMany({
      where: {
        date: {
          gte: new Date('2026-01-01T00:00:00Z'),
          lt: new Date('2026-02-01T00:00:00Z'),
        },
      },
      select: {
        id: true,
        date: true,
        firstIn: true,
        lastOut: true,
        workingHours: true,
        status: true,
        logs: true,
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 20,
    });

    console.log(`\n=== January 2026 Attendance Logs ===`);
    console.log(`Total logs fetched: ${januaryLogs.length}\n`);

    januaryLogs.forEach((log, index) => {
      console.log(`\n--- Log ${index + 1} ---`);
      console.log(`Employee: ${log.employee?.employeeCode} - ${log.employee?.firstName} ${log.employee?.lastName}`);
      console.log(`Date: ${log.date}`);
      console.log(`First In: ${log.firstIn}`);
      console.log(`Last Out: ${log.lastOut}`);
      console.log(`Working Hours: ${log.workingHours}`);
      console.log(`Status: ${log.status}`);
      
      if (log.logs) {
        try {
          const punches = JSON.parse(log.logs as string);
          console.log(`Punches (${punches.length}):`, punches);
        } catch (e) {
          console.log(`Punches: Unable to parse`);
        }
      }
    });

    // Count logs with/without lastOut
    const withLastOut = januaryLogs.filter(l => l.lastOut !== null).length;
    const withoutLastOut = januaryLogs.filter(l => l.lastOut === null).length;

    console.log(`\n\n=== Summary ===`);
    console.log(`Logs with Last Out: ${withLastOut}`);
    console.log(`Logs without Last Out: ${withoutLastOut}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJanuaryData();
