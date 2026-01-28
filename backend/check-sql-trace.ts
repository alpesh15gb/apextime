
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

async function checkPerson() {
    try {
        const pool = await sql.connect(config);

        console.log('\n--- Searching for Srikanth Reddy ---');
        const result = await pool.request().query("SELECT TOP 5 EmployeeId, EmployeeName, EmployeeCode, StringCode, NumericCode FROM Employees WHERE EmployeeName LIKE '%Srikanth Reddy%'");
        console.table(result.recordset);

        if (result.recordset.length > 0) {
            const empId = result.recordset[0].EmployeeId;
            console.log(`\n--- Device registrations for EmployeeId: ${empId} ---`);
            const duResult = await pool.request().query(`SELECT * FROM DeviceUsers WHERE EmployeeId = ${empId}`);
            console.table(duResult.recordset);
        }

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkPerson();
