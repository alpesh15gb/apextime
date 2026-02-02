
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function runTest() {
    console.log('Finding a registered Hikvision Direct device...');
    const device = await prisma.device.findFirst({
        where: { protocol: 'HIKVISION_DIRECT' }
    });

    if (!device) {
        console.error('ERROR: No device found with protocol HIKVISION_DIRECT. Please add one in the web interface first.');
        process.exit(1);
    }

    console.log(`Found device: ${device.name} (SN: ${device.deviceId})`);

    const punchData = {
        employeeNo: '9999',
        name: 'SIMULATED_TEST_USER',
        time: new Date().toISOString(),
        serialNo: device.deviceId
    };

    console.log('Sending simulated punch to local backend...');
    try {
        // We use localhost:5001 because we run this inside the container if possible, 
        // OR we use the service name 'backend' if we run it in a separate container.
        // But for simplicity, let's just use the external URL if the server is public.
        const url = 'https://ksipl.apextime.in/api/hikvision/event';

        console.log(`POST to ${url}`);
        const response = await axios.post(url, punchData);
        console.log('Response:', response.status, response.data);

        console.log('Wait 2 seconds and check if employee was created/updated...');
        await new Promise(r =\u003e setTimeout(r, 2000));

        const emp = await prisma.employee.findFirst({
            where: { deviceUserId: '9999' }
        });

        if (emp) {
            console.log('SUCCESS: Employee was found in database!', emp.firstName, emp.lastName);
        } else {
            console.log('FAILED: Employee with ID 9999 not found in database.');
        }

    } catch (err) {
        console.error('Test failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
