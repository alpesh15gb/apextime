const sql = require('mssql');

const config = {
    user: process.env.SQL_SERVER_USER || 'essl',
    password: process.env.SQL_SERVER_PASSWORD || 'Keystone@456',
    server: process.env.SQL_SERVER_HOST || '115.98.2.20',
    port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
    database: process.env.SQL_SERVER_DATABASE || 'etimetracklite1',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function checkSchema() {
    try {
        await sql.connect(config);
        console.log('Connected to SQL Server');

        const result = await sql.query`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DeviceCommands'
        `;

        console.log('Schema for DeviceCommands:');
        console.table(result.recordset);

    } catch (err) {
        console.error('SQL Error:', err);
    } finally {
        await sql.close();
    }
}

checkSchema();
