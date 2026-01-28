
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

        console.log('\n--- Employees Table ---');
        const empCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees'");
        empCols.recordset.forEach(r => console.log(`EMP COL: ${r.COLUMN_NAME}`));

        console.log('\n--- DeviceUsers Table ---');
        const duCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DeviceUsers'");
        duCols.recordset.forEach(r => console.log(`DU COL: ${r.COLUMN_NAME}`));

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();
