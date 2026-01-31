
<<<<<<< HEAD
import { getHikCentralPool, closeAllPools } from '../config/database';
=======
import { getHikCentralPool, closeHikCentralPool } from '../config/database';
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

async function inspectHikCentral() {
    try {
        console.log('Connecting to HikCentral...');
        const pool = await getHikCentralPool();

        // Check tables
        const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME = 'HikvisionLogs'
    `);

        if (tablesResult.recordset.length === 0) {
            console.log('Table "HikvisionLogs" NOT found. Listing all tables:');
            const allTables = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'
      `);
            console.table(allTables.recordset);
        } else {
            console.log('Table "HikvisionLogs" found!');

            // Get Columns
            const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'HikvisionLogs'
      `);
            console.table(columnsResult.recordset);

            // Get Sample Data
            console.log('Fetching sample data (top 1)...');
            const sample = await pool.request().query('SELECT TOP 1 * FROM HikvisionLogs');
            console.log(sample.recordset[0]);
        }

    } catch (error) {
        console.error('Error inspecting HikCentral:', error);
    } finally {
<<<<<<< HEAD
        await closeAllPools();
=======
        await closeHikCentralPool();
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
    }
}

inspectHikCentral();
