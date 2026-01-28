import express from 'express';
import { getSqlPool, prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

// GET /update-names - Show employees that need name updates
router.get('/', async (req, res) => {
  try {
    // Get all PostgreSQL employees with deviceUserId
    const pgEmployees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } },
      orderBy: { deviceUserId: 'asc' }
    });

    // Get all SQL Server employees
    const pool = await getSqlPool();
    const sqlResult = await pool.request().query(`
      SELECT
        EmployeeCodeInDevice,
        EmployeeName,
        DepartmentId
      FROM Employees
      WHERE EmployeeCodeInDevice IS NOT NULL
        AND Status = 'Working'
    `);

    // Create SQL Server lookup by EmployeeCodeInDevice
    const sqlData = new Map<string, { name: string; deptId: number }>();
    for (const row of sqlResult.recordset) {
      const code = row.EmployeeCodeInDevice?.toString();
      if (code && row.EmployeeName) {
        sqlData.set(code, {
          name: row.EmployeeName,
          deptId: row.DepartmentId
        });
      }
    }

    // Find employees needing name updates
    const toUpdate = [];
    for (const emp of pgEmployees) {
      const code = emp.deviceUserId!;
      const sqlInfo = sqlData.get(code);

      if (!sqlInfo) continue;

      // Check if name needs updating
      const currentName = `${emp.firstName} ${emp.lastName}`.trim();
      const sqlName = sqlInfo.name.trim();

      // Skip if SQL name is just a number (not a real name)
      if (/^\d+$/.test(sqlName)) continue;

      // Needs update if current name is different from SQL name
      if (currentName !== sqlName) {
        toUpdate.push({
          deviceUserId: code,
          currentName,
          sqlName,
          deptId: sqlInfo.deptId,
          employeeCode: emp.employeeCode
        });
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Update Employee Names</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1000px; margin: 30px auto; padding: 20px; }
          .employee { background: #f5f5f5; padding: 10px; margin: 8px 0; border-radius: 5px; }
          .current { color: red; }
          .new { color: green; font-weight: bold; }
          button { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #218838; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
          .stats { background: #d1ecf1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Update Employee Names from SQL Server</h1>
        <div class="stats">
          <strong>${toUpdate.length} employees</strong> need name updates
        </div>
        <form method="POST" action="">
          <button type="submit">Update All Names</button>
        </form>
        <div style="margin-top: 20px;">
          ${toUpdate.map(e => `
            <div class="employee">
              <code>${e.deviceUserId}</code> |
              Current: <span class="current">${e.currentName}</span> →
              New: <span class="new">${e.sqlName}</span>
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

// POST /update-names - Update names from SQL Server
router.post('/', async (req, res) => {
  try {
    logger.info('Starting name update from SQL Server...');

    const pool = await getSqlPool();

    // Get SQL Server employee data
    const sqlResult = await pool.request().query(`
      SELECT
        e.EmployeeCodeInDevice,
        e.EmployeeName,
        d.DepartmentFName as DepartmentName
      FROM Employees e
      LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
      WHERE e.EmployeeCodeInDevice IS NOT NULL
        AND e.Status = 'Working'
    `);

    // Build lookup by EmployeeCodeInDevice
    const sqlData = new Map<string, { name: string; dept: string }>();
    for (const row of sqlResult.recordset) {
      const code = row.EmployeeCodeInDevice?.toString();
      if (code && row.EmployeeName && !/^\d+$/.test(row.EmployeeName.trim())) {
        sqlData.set(code, {
          name: row.EmployeeName.trim(),
          dept: row.DepartmentName
        });
      }
    }

    // Get PostgreSQL employees
    const pgEmployees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } }
    });

    const results: { code: string; old: string; new: string; status: string }[] = [];

    for (const emp of pgEmployees) {
      const code = emp.deviceUserId!;
      const info = sqlData.get(code);

      if (!info) {
        results.push({ code, old: `${emp.firstName} ${emp.lastName}`, new: 'N/A', status: 'no_sql_match' });
        continue;
      }

      const currentName = `${emp.firstName} ${emp.lastName}`.trim();

      // Skip if already correct
      if (currentName === info.name) {
        continue;
      }

      // Parse new name
      const parts = info.name.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      try {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { firstName, lastName: lastName || '' }
        });

        results.push({ code, old: currentName, new: info.name, status: 'updated' });
        logger.info(`Updated ${code}: "${currentName}" → "${info.name}"`);
      } catch (e) {
        results.push({ code, old: currentName, new: info.name, status: 'error' });
      }
    }

    res.json({
      message: `Updated ${results.filter(r => r.status === 'updated').length} employees`,
      updated: results.filter(r => r.status === 'updated').length,
      skipped: results.filter(r => r.status === 'no_sql_match').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    });
  } catch (error) {
    logger.error('Update failed:', error);
    res.status(500).json({ error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' });
  }
});

export default router;
