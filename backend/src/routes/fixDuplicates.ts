import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

// Temporarily skipping auth for manual fix - remove this comment after use

// GET /fix-duplicates - Show form with button
router.get('/', async (req, res) => {
  try {
    // Count duplicates first
    const allEmployees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } },
      select: { deviceUserId: true, firstName: true, lastName: true, employeeCode: true },
    });

    const byCode = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      const code = emp.deviceUserId!;
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code)!.push(emp);
    }

    const duplicates = Array.from(byCode.entries()).filter(([_, emps]) => emps.length > 1);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fix Duplicate Employees</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .duplicate { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .kept { color: green; font-weight: bold; }
          .remove { color: red; }
          button { background: #007bff; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #0056b3; }
          .warning { background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Fix Duplicate Employees</h1>
        <div class="warning">
          <strong>Found ${duplicates.length} duplicate deviceUserId codes</strong>
        </div>
        ${duplicates.map(([code, emps]) => `
          <div class="duplicate">
            <strong>Code: ${code}</strong>
            <ul>
              ${emps.map(e => {
                const name = `${e.firstName} ${e.lastName}`.trim();
                const isNumeric = /^\d+$/.test(e.firstName);
                return `<li class="${isNumeric ? 'remove' : 'kept'}">${name} (${e.employeeCode}) ${isNumeric ? '- will be deleted' : '- will be kept'}</li>`;
              }).join('')}
            </ul>
          </div>
        `).join('')}
        <form method="POST" action="">
          <button type="submit">Merge Duplicates</button>
        </form>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

// POST /fix-duplicates - Merge duplicate employees
router.post('/', async (req, res) => {
  try {
    logger.info('Starting duplicate employee fix...');

    // Find all employees with deviceUserId
    const allEmployees = await prisma.employee.findMany({
      where: {
        deviceUserId: {
          not: null,
        },
      },
      orderBy: {
        deviceUserId: 'asc',
      },
    });

    // Group by deviceUserId
    const byDeviceUserId = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      const code = emp.deviceUserId!;
      if (!byDeviceUserId.has(code)) {
        byDeviceUserId.set(code, []);
      }
      byDeviceUserId.get(code)!.push(emp);
    }

    // Find duplicates
    const duplicates: { code: string; employees: typeof allEmployees }[] = [];
    for (const [code, employees] of byDeviceUserId) {
      if (employees.length > 1) {
        duplicates.push({ code, employees });
      }
    }

    const results: {
      code: string;
      kept: string;
      removed: string[];
      attendanceMigrated: number;
    }[] = [];

    for (const { code, employees } of duplicates) {
      // Determine which to keep (the one with proper name, not just a number)
      let keepIndex = 0;
      for (let i = 0; i < employees.length; i++) {
        const name = `${employees[i].firstName} ${employees[i].lastName}`.trim();
        // If name is not just a number, keep this one
        if (!/^\d+$/.test(employees[i].firstName) && !/^EMP\d+$/.test(name)) {
          keepIndex = i;
          break;
        }
      }

      const keep = employees[keepIndex];
      const remove = employees.filter((_, i) => i !== keepIndex);

      let attendanceMigrated = 0;

      // Merge attendance logs from duplicates to the kept employee
      for (const dup of remove) {
        const count = await prisma.attendanceLog.count({
          where: { employeeId: dup.id },
        });

        if (count > 0) {
          await prisma.attendanceLog.updateMany({
            where: { employeeId: dup.id },
            data: { employeeId: keep.id },
          });
          attendanceMigrated += count;
        }

        // Delete the duplicate employee
        await prisma.employee.delete({
          where: { id: dup.id },
        });
      }

      results.push({
        code,
        kept: `${keep.firstName} ${keep.lastName} (${keep.employeeCode})`,
        removed: remove.map((e) => `${e.firstName} ${e.lastName} (${e.employeeCode})`),
        attendanceMigrated,
      });
    }

    logger.info(`Duplicate employee fix completed. Merged ${results.length} duplicates.`);

    res.json({
      message: `Merged ${results.length} duplicate employee codes`,
      results,
    });
  } catch (error) {
    logger.error('Fix duplicates failed:', error);
    res.status(500).json({
      error: 'Failed to fix duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
