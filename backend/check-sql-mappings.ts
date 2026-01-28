
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    user: 'essl',
    password: 'Keystone@456',
    server: '115.98.2.20', // Using the remote IP as I cannot access localhost/sqlexpress from here
    database: 'etimetracklite1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

async function checkMappings() {
    try {
        console.log('Connecting to SQL Server...');
        const pool = await sql.connect(config);

        console.log('\n--- Checking Employees table structure ---');
        const columns = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees'");
        console.log('Available columns in Employees:', columns.recordset.map(r => r.COLUMN_NAME).join(', '));

        console.log('\n--- Sample Employee Mappings (First 20) ---');
        const result = await pool.request().query(`
      SELECT TOP 20 
        EmployeeId, 
        EmployeeName, 
        EmployeeCode, 
        EmployeeCodeInDevice,
        (SELECT COUNT(*) FROM DeviceUsers du WHERE du.EmployeeId = Employees.EmployeeId) as DeviceUserCount
      FROM Employees
      WHERE Status = 'Working'
      ORDER BY EmployeeName
    `);

        console.table(result.recordset);

        console.log('\n--- Employees with Multiple Device Registrations ---');
        const duplicates = await pool.request().query(`
      SELECT EmployeeName, COUNT(*) as Count
      FROM Employees
      WHERE Status = 'Working'
      GROUP BY EmployeeName
      HAVING COUNT(*) > 1
    `);

        if (duplicates.recordset.length > 0) {
            console.log('Found names that appear multiple times in SQL Server:');
            console.table(duplicates.recordset);
        } else {
            console.log('No duplicate EmployeeNames found in SQL Server (Employees table is clean).');
        }

        console.log('\n--- DeviceUsers mapping details ---');
        const duDetails = await pool.request().query(`
      SELECT TOP 20 
        du.DeviceId, 
        du.UserId as DeviceUserId, 
        e.EmployeeName, 
        e.EmployeeId
      FROM DeviceUsers du
      JOIN Employees e ON du.EmployeeId = e.EmployeeId
      ORDER BY e.EmployeeName
    `);
        console.table(duDetails.recordset);

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkMappings();
