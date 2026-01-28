
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

async function checkData() {
    try {
        const pool = await sql.connect(config);

        console.log('\n--- Sample Data from Employees ---');
        const empResult = await pool.request().query("SELECT TOP 5 EmployeeId, EmployeeCode, EmployeeName FROM Employees");
        console.table(empResult.recordset);

        console.log('\n--- Sample Data from DeviceUsers ---');
        const duResult = await pool.request().query("SELECT TOP 5 DeviceId, UserId, EmployeeId FROM DeviceUsers");
        console.table(duResult.recordset);

        console.log('\n--- Example of an employee with multiple device IDs ---');
        const query = `
      SELECT e.EmployeeName, e.EmployeeCode, du.DeviceId, du.UserId
      FROM Employees e
      JOIN DeviceUsers du ON e.EmployeeId = du.EmployeeId
      WHERE e.EmployeeId IN (
        SELECT EmployeeId FROM DeviceUsers GROUP BY EmployeeId HAVING COUNT(*) > 1
      )
      ORDER BY e.EmployeeName
    `;
        const multis = await pool.request().query(query);
        console.table(multis.recordset);

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
