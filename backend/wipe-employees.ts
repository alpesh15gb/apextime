
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Reset: Employees and Attendance ---');

    try {
        // Delete in order to respect foreign keys
        console.log('Deleting Attendance Logs...');
        await prisma.attendanceLog.deleteMany({});

        console.log('Deleting Leave Entries...');
        await prisma.leaveEntry.deleteMany({});

        console.log('Deleting Employee Shifts...');
        await prisma.employeeShift.deleteMany({});

        console.log('Deleting Raw Device Logs...');
        await prisma.rawDeviceLog.deleteMany({});

        console.log('Deleting All Employees...');
        await prisma.employee.deleteMany({});

        console.log('Resetting Sync Status...');
        await prisma.syncStatus.deleteMany({});

        console.log('SUCCESS: All employees and attendance data have been removed.');
        console.log('Next sync will start completely fresh using the new ID-based mapping.');
    } catch (error) {
        console.error('FAILED to reset database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
