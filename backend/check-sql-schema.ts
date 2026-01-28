
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

async function checkSchema() {
    try {
        const pool = await sql.connect(config);

        console.log('\n--- Employees Table Columns ---');
        const empCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees'");
        console.log(empCols.recordset.map(r => r.COLUMN_NAME).join(', '));

        console.log('\n--- DeviceUsers Table Columns ---');
        const duCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DeviceUsers'");
        console.log(duCols.recordset.map(r => r.COLUMN_NAME).join(', '));

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();
