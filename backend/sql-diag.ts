import { getSqlPool } from './src/config/database';
import sql from 'mssql';

async function run() {
    console.log('--- SQL DIAGNOSTICS ---');
    try {
        const pool = await getSqlPool();

        // 1. List all tables to see what exists for 2026
        const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE 'DeviceLogs%'
    `);
        const tables = tablesResult.recordset.map((r: any) => r.TABLE_NAME);
        console.log('Found tables:', tables);

        // 2. Check counts for each table
        for (const table of tables) {
            const countRes = await pool.request().query(`SELECT COUNT(*) as cnt FROM ${table} WHERE LogDate >= '2026-01-01'`);
            console.log(`Table ${table} has ${countRes.recordset[0].cnt} logs from 2026.`);

            if (countRes.recordset[0].cnt > 0) {
                const latestRes = await pool.request().query(`SELECT TOP 1 LogDate FROM ${table} ORDER BY LogDate DESC`);
                console.log(`   - Latest log in ${table}: ${latestRes.recordset[0].LogDate}`);
            }
        }

    } catch (err) {
        console.error('SQL Error:', err);
    }
}

run();
