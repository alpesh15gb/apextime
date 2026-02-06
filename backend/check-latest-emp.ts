import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestEmployee() {
    console.log('🔍 Checking latest created employee...');
    const latest = await prisma.employee.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (latest) {
        console.log(`Latest Employee:
        ID: ${latest.id}
        Code: ${latest.employeeCode}
        Name: ${latest.firstName} ${latest.lastName}
        DeviceUserID: ${latest.deviceUserId}
        Created At: ${latest.createdAt}`);
    } else {
        console.log('No employees found.');
    }
}

checkLatestEmployee()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
