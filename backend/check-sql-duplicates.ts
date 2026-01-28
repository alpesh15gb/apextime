
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

async function checkDuplicatesSql() {
    try {
        const pool = await sql.connect(config);

        const query = `
      SELECT EmployeeName, COUNT(*) as UserCount
      FROM Employees
      WHERE Status = 'Working'
      GROUP BY EmployeeName
      HAVING COUNT(*) > 1
      ORDER BY UserCount DESC
    `;
        const result = await pool.request().query(query);

        console.log('DUPLICATE_NAMES_IN_SQL:');
        console.log(JSON.stringify(result.recordset, null, 2));

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkDuplicatesSql();
