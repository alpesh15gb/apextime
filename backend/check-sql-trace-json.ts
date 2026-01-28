
import sql from 'mssql';

const config = {
    user: 'essl',
    password: 'Keystone@456',
    server: '115.98.2.20',
    database: 'etimetracklite1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

async function checkPersonJson() {
    try {
        const pool = await sql.connect(config);

        const result = await pool.request().query("SELECT TOP 5 EmployeeId, EmployeeName, EmployeeCode, StringCode, NumericCode FROM Employees WHERE EmployeeName LIKE '%Srikanth Reddy%'");
        console.log('EMPLOYEES_RESULT:');
        console.log(JSON.stringify(result.recordset, null, 2));

        if (result.recordset.length > 0) {
            const empId = result.recordset[0].EmployeeId;
            const duResult = await pool.request().query(`SELECT * FROM DeviceUsers WHERE EmployeeId = ${empId}`);
            console.log('DEVICE_USERS_RESULT:');
            console.log(JSON.stringify(duResult.recordset, null, 2));
        }

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkPersonJson();
