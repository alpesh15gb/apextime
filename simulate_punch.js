
const axios = require('axios');

const simulatePunch = async () => {
    const url = 'https://ksipl.apextime.in/api/hikvision/event';
    const payload = {
        employeeNo: 'TEST_USER_001',
        time: new Date().toISOString(),
        serialNo: 'TEST_HIK_SN_12345'
    };

    try {
        console.log(`Sending simulated punch to ${url}...`);
        const response = await axios.post(url, payload);
        console.log('Response Status:', response.status);
        console.log('Response Body:', response.data);
    } catch (error) {
        console.error('Simulation failed:', error.message);
        if (error.response) {
            console.error('Error Body:', error.response.data);
        }
    }
};

simulatePunch();
