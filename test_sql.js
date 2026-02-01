const sql = require('mssql');

const config = {
    user: 'essl',
    password: 'YOUR_PASSWORD_HERE', // I need the password!
    server: '115.98.2.20',
    database: 'etimetracklite1',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

(async function () {
    try {
        await sql.connect(config);
        console.log("Connected to SQL Server successfully!");
        const result = await sql.query`select count(*) as count from DeviceLogs`;
        console.log(result.recordset[0]);
        process.exit(0);
    } catch (err) {
        console.error("Connection failed:", err);
        process.exit(1);
    }
})();
