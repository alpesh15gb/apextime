import express from 'express';
import { getSqlPool, prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

// GET /update-names - Show form
router.get('/', async (req, res) => {
  try {
    // Get employees with numeric names
    const numericEmployees = await prisma.employee.findMany({
      where: {
        deviceUserId: { not: null },
        OR: [
          { firstName: { equals: 'Employee' } },
          { firstName: { contains: '' } } // Get all to check
        ]
      },
      orderBy: { deviceUserId: 'asc' }
    });

    // Filter to only those with numeric-looking names
    const toUpdate = numericEmployees.filter(e => {
      const name = `${e.firstName} ${e.lastName}`.trim();
      return /^\d+$/.test(e.firstName) ||
             /^\d+$/.test(e.lastName) ||
             (name === `Employee ${e.deviceUserId}`);
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
          button { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #218838; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>Update Employee Names from SQL Server</h1>
        <p>Found ${toUpdate.length} employees with numeric/default names that can be updated.</p>
        <form method="POST" action="">
          <button type="submit">Update All Names</button>
        </form>
        <div style="margin-top: 20px;">
          ${toUpdate.map(e => `
            <div class="employee">
              deviceUserId: <code>${e.deviceUserId}</code> |
              Current: <span class="current">${e.firstName} ${e.lastName}</span> |
              Code: ${e.employeeCode}
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

    // Get all employees from SQL Server with proper names
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

    // Create lookup map
    const sqlData = new Map<string, { name: string; dept: string; desig: string }>();
    for (const row of sqlResult.recordset) {
      const code = row.deviceUserId?.toString();
      if (code && row.EmployeeName && !/^\d+$/.test(row.EmployeeName.trim())) {
        sqlData.set(code, {
          name: row.EmployeeName,
          dept: row.DepartmentName,
          desig: row.Designation
        });
      }
    }

    // Get postgres employees that need updating
    const employees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } }
    });

    const results: { deviceUserId: string; oldName: string; newName: string; status: string }[] = [];

    for (const emp of employees) {
      const code = emp.deviceUserId!;
      const sqlInfo = sqlData.get(code);

      if (!sqlInfo) continue;

      const currentName = `${emp.firstName} ${emp.lastName}`.trim();
      const needsUpdate =
        /^\d+$/.test(emp.firstName) ||
        /^\d+$/.test(emp.lastName) ||
        currentName === `Employee ${code}`;

      if (needsUpdate) {
        // Parse name
        const parts = sqlInfo.name.trim().split(/\s+/);
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
            oldName: currentName,
            newName: sqlInfo.name,
            status: 'updated'
          });
        } catch (e) {
          results.push({
            deviceUserId: code,
            oldName: currentName,
            newName: sqlInfo.name,
            status: 'error: ' + (e instanceof Error ? e.message : 'unknown')
          });
        }
      }
    }

    logger.info(`Updated ${results.filter(r => r.status === 'updated').length} employee names`);

    res.json({
      message: `Updated ${results.filter(r => r.status === 'updated').length} employee names`,
      updated: results.filter(r => r.status === 'updated').length,
      errors: results.filter(r => r.status !== 'updated').length,
      results
    });
  } catch (error) {
    logger.error('Name update failed:', error);
    res.status(500).json({ error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' });
  }
});

export default router;
