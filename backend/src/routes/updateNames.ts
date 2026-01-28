import express from 'express';
import { getSqlPool, prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

// GET /update-names - Show form
router.get('/', async (req, res) => {
  try {
    const pool = await getSqlPool();

    // Get HO code names from SQL Server
    const sqlResult = await pool.request().query(`
      SELECT EmployeeCodeInDevice, EmployeeName
      FROM Employees
      WHERE EmployeeCodeInDevice LIKE 'HO%'
        AND EmployeeName IS NOT NULL
        AND Status = 'Working'
    `);

    const hoNames = new Map<string, string>();
    for (const row of sqlResult.recordset) {
      const code = row.EmployeeCodeInDevice?.toString();
      if (code && row.EmployeeName && !/^\d+$/.test(row.EmployeeName.trim())) {
        hoNames.set(code, row.EmployeeName);
      }
    }

    // Get employees with numeric names from PostgreSQL
    const numericEmployees = await prisma.employee.findMany({
      where: {
        deviceUserId: { not: null },
        firstName: { not: '' }
      },
      orderBy: { deviceUserId: 'asc' }
    });

    // Filter to only numeric codes with numeric names
    const toUpdate = numericEmployees.filter(e => {
      const code = e.deviceUserId!;
      return /^\d+$/.test(code) && /^\d+$/.test(e.firstName);
    }).map(e => {
      const hoCode = 'HO' + e.deviceUserId!.padStart(3, '0');
      return {
        ...e,
        hoCode,
        newName: hoNames.get(hoCode) || 'NOT FOUND'
      };
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Update Employee Names</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; }
          .employee { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .current { color: red; }
          .new { color: green; font-weight: bold; }
          .notfound { color: orange; }
          button { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #218838; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>Update Employee Names from SQL Server</h1>
        <p>Maps numeric codes to HO codes and updates names.</p>
        <form method="POST" action="">
          <button type="submit">Update All Names</button>
        </form>
        <div style="margin-top: 20px;">
          ${toUpdate.map(e => `
            <div class="employee">
              deviceUserId: <code>${e.deviceUserId}</code> -> HO: <code>${e.hoCode}</code><br/>
              Current: <span class="current">${e.firstName} ${e.lastName}</span> ->
              New: <span class="${e.newName === 'NOT FOUND' ? 'notfound' : 'new'}">${e.newName}</span>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
  }
});

// POST /update-names - Update names from SQL Server (map numeric codes to HO codes)
router.post('/', async (req, res) => {
  try {
    logger.info('Starting name update from SQL Server...');

    const pool = await getSqlPool();

    // Get all employees from SQL Server with proper names (HO codes)
    const sqlResult = await pool.request().query(`
      SELECT
        e.EmployeeCodeInDevice as deviceUserId,
        e.EmployeeName,
        e.Designation,
        d.DepartmentFName as DepartmentName
      FROM Employees e
      LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
      WHERE e.EmployeeCodeInDevice IS NOT NULL
        AND e.EmployeeCodeInDevice <> ''
        AND e.Status = 'Working'
    `);

    // Create lookup map for HO codes (e.g., HO018 -> name)
    const hoNames = new Map<string, string>();
    for (const row of sqlResult.recordset) {
      const code = row.deviceUserId?.toString();
      // Only use HO codes with proper names
      if (code?.startsWith('HO') && row.EmployeeName && !/^\d+$/.test(row.EmployeeName.trim())) {
        hoNames.set(code, row.EmployeeName);
      }
    }

    // Get postgres employees with numeric names that need updating
    const employees = await prisma.employee.findMany({
      where: {
        deviceUserId: { not: null },
        firstName: { not: '' } // Get all to filter
      }
    });

    const results: { deviceUserId: string; oldName: string; newName: string; status: string }[] = [];

    for (const emp of employees) {
      const code = emp.deviceUserId!;

      // Only process numeric codes (18, 38, etc.)
      if (!/^\d+$/.test(code)) continue;

      // Check if current name is also just a number
      if (!/^\d+$/.test(emp.firstName)) continue;

      // Map to HO code (18 -> HO018)
      const hoCode = 'HO' + code.padStart(3, '0');
      const properName = hoNames.get(hoCode);

      if (!properName) {
        results.push({
          deviceUserId: code,
          oldName: `${emp.firstName} ${emp.lastName}`,
          newName: 'NOT FOUND',
          status: 'skipped - no HO code mapping'
        });
        continue;
      }

      // Parse name
      const parts = properName.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      try {
        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            firstName,
            lastName: lastName || ''
          }
        });

        results.push({
          deviceUserId: code,
          oldName: `${emp.firstName} ${emp.lastName}`,
          newName: properName,
          status: 'updated'
        });
      } catch (e) {
        results.push({
          deviceUserId: code,
          oldName: `${emp.firstName} ${emp.lastName}`,
          newName: properName,
          status: 'error: ' + (e instanceof Error ? e.message : 'unknown')
        });
      }
    }

    logger.info(`Updated ${results.filter(r => r.status === 'updated').length} employee names`);

    res.json({
      message: `Updated ${results.filter(r => r.status === 'updated').length} employee names`,
      updated: results.filter(r => r.status === 'updated').length,
      skipped: results.filter(r => r.status.includes('skipped')).length,
      errors: results.filter(r => r.status.includes('error')).length,
      results
    });
  } catch (error) {
    logger.error('Name update failed:', error);
    res.status(500).json({ error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' });
  }
});

export default router;
