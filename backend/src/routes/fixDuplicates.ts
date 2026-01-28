import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';
import { normalizeName } from '../utils/nameUtils';

const router = express.Router();

// Temporarily skipping auth for manual fix

// GET /fix-duplicates - Show duplicates and merge button
router.get('/', async (req, res) => {
  try {
    // Get all employees
    const allEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { deviceUserId: { not: null } },
          { sourceEmployeeId: { not: null } }
        ]
      },
      select: { id: true, deviceUserId: true, firstName: true, lastName: true, employeeCode: true, departmentId: true, sourceEmployeeId: true },
    });

    // Group by normalized name
    const byName = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      const normalized = normalizeName(emp.firstName, emp.lastName);
      if (normalized.length < 3) continue; // Skip short names
      if (!byName.has(normalized)) byName.set(normalized, []);
      byName.get(normalized)!.push(emp);
    }

    // Find name duplicates
    const nameDuplicates = Array.from(byName.entries())
      .filter(([_, emps]) => emps.length > 1)
      .sort((a, b) => a[0].localeCompare(b[0]));

    // 2. Also check for numeric firstName duplicates (like "38" and "HO038")
    const numericCodes = allEmployees.filter(e => /^\d+$/.test(e.firstName));
    const hoMappings: { numeric: any, ho: any }[] = [];

    for (const num of numericCodes) {
      const padded = num.firstName.padStart(3, '0');
      const hoCode = `HO${padded}`;
      const hoMatch = allEmployees.find(e =>
        e.deviceUserId === hoCode ||
        e.employeeCode === hoCode
      );
      if (hoMatch) {
        hoMappings.push({ numeric: num, ho: hoMatch });
      }
    }

    // 3. Find sourceEmployeeId duplicates (the 2644 ID)
    const bySourceId = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      if (emp.sourceEmployeeId) {
        if (!bySourceId.has(emp.sourceEmployeeId)) bySourceId.set(emp.sourceEmployeeId, []);
        bySourceId.get(emp.sourceEmployeeId)!.push(emp);
      }
    }
    const sourceIdDuplicates = Array.from(bySourceId.entries())
      .filter(([_, emps]) => emps.length > 1);

    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        nameDuplicates,
        hoMappings,
        sourceIdDuplicates
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fix Duplicate Employees</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; }
          .section { margin: 20px 0; }
          .duplicate { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .kept { color: green; font-weight: bold; }
          .remove { color: red; }
          button { background: #007bff; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 10px 10px 0 0; }
          button:hover { background: #0056b3; }
          button.secondary { background: #28a745; }
          button.secondary:hover { background: #218838; }
          .warning { background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          .info { background: #d1ecf1; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>Fix Duplicate Employees</h1>

        <div class="info">
          Found <strong>${nameDuplicates.length}</strong> duplicate names and
          <strong>${hoMappings.length}</strong> numeric/HO code pairs.
        </div>

        ${nameDuplicates.length > 0 ? `
        <div class="section">
          <h2>Duplicate Names (same person, different deviceUserIds)</h2>
          ${nameDuplicates.map(([name, emps]) => `
            <div class="duplicate">
              <strong>${emps[0].firstName} ${emps[0].lastName}</strong>
              <ul>
                ${emps.map(e => {
      const isNumeric = /^\d+$/.test(e.firstName);
      return `<li class="${isNumeric ? 'remove' : 'kept'}">deviceUserId: <code>${e.deviceUserId}</code> | code: ${e.employeeCode} ${isNumeric ? '(will delete)' : '(will keep)'}</li>`;
    }).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${hoMappings.length > 0 ? `
        <div class="section">
          <h2>Numeric → HO Code Mappings</h2>
          <p>These will merge numeric codes (like "38") into their HO equivalents (like "HO038")</p>
          ${hoMappings.map(({ numeric, ho }) => `
            <div class="duplicate">
              <span class="remove">${numeric.firstName} (${numeric.employeeCode}, deviceUserId: ${numeric.deviceUserId})</span>
              →
              <span class="kept">${ho.firstName} ${ho.lastName} (${ho.employeeCode}, deviceUserId: ${ho.deviceUserId})</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <form method="POST" action="">
          <button type="submit" class="secondary">Merge All Duplicates</button>
        </form>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

// POST /fix-duplicates - Merge duplicates
router.post('/', async (req, res) => {
  try {
    logger.info('Starting duplicate employee fix...');

    const allEmployees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } },
    });

    const results: { type: string; kept: string; removed: string[]; attendanceMigrated: number }[] = [];

    // 1. Merge by name duplicates
    const byName = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      const normalized = normalizeName(emp.firstName, emp.lastName);
      if (normalized.length < 3) continue;
      if (!byName.has(normalized)) byName.set(normalized, []);
      byName.get(normalized)!.push(emp);
    }

    for (const [_, emps] of byName) {
      if (emps.length < 2) continue;

      // Keep the one with proper name (not just a number)
      let keep = emps.find(e => !/^\d+$/.test(e.firstName));
      if (!keep) keep = emps[0];

      const remove = emps.filter(e => e.id !== keep.id);

      let attendanceMigrated = 0;
      for (const dup of remove) {
        const count = await prisma.attendanceLog.count({ where: { employeeId: dup.id } });
        if (count > 0) {
          await prisma.attendanceLog.updateMany({
            where: { employeeId: dup.id },
            data: { employeeId: keep.id },
          });
          attendanceMigrated += count;
        }
        await prisma.employee.delete({ where: { id: dup.id } });
      }

      results.push({
        type: 'name',
        kept: `${keep.firstName} ${keep.lastName} (${keep.employeeCode})`,
        removed: remove.map(e => `${e.firstName} ${e.lastName} (${e.employeeCode})`),
        attendanceMigrated,
      });
    }

    // 2. Merge numeric codes into HO codes
    const remainingEmployees = await prisma.employee.findMany({ where: { deviceUserId: { not: null } } });
    const numericCodes = remainingEmployees.filter(e => /^\d+$/.test(e.firstName));

    for (const num of numericCodes) {
      const padded = num.firstName.padStart(3, '0');
      const hoCode = `HO${padded}`;
      const hoMatch = remainingEmployees.find(e => e.deviceUserId === hoCode);

      if (hoMatch) {
        // Merge numeric into HO
        const count = await prisma.attendanceLog.count({ where: { employeeId: num.id } });
        if (count > 0) {
          await prisma.attendanceLog.updateMany({
            where: { employeeId: num.id },
            data: { employeeId: hoMatch.id },
          });
        }
        await prisma.employee.delete({ where: { id: num.id } });

        results.push({
          type: 'ho-mapping',
          kept: `${hoMatch.firstName} ${hoMatch.lastName} (${hoMatch.employeeCode}, deviceUserId: ${hoMatch.deviceUserId})`,
          removed: [`${num.firstName} (${num.employeeCode}, deviceUserId: ${num.deviceUserId})`],
          attendanceMigrated: count,
        });
      }
    }

    // 3. Merge by sourceEmployeeId duplicates
    const finalEmployees = await prisma.employee.findMany();
    const bySourceId = new Map<string, typeof finalEmployees>();
    for (const emp of finalEmployees) {
      if (emp.sourceEmployeeId) {
        if (!bySourceId.has(emp.sourceEmployeeId)) bySourceId.set(emp.sourceEmployeeId, []);
        bySourceId.get(emp.sourceEmployeeId)!.push(emp);
      }
    }

    for (const [sourceId, emps] of bySourceId) {
      if (emps.length < 2) continue;

      // Keep the one with most info (or first one)
      const keep = emps[0];
      const remove = emps.slice(1);

      let attendanceMigrated = 0;
      for (const dup of remove) {
        const count = await prisma.attendanceLog.count({ where: { employeeId: dup.id } });
        if (count > 0) {
          // Check for existing records on same date to avoid primary key conflicts
          const existingDates = await prisma.attendanceLog.findMany({
            where: { employeeId: keep.id },
            select: { date: true }
          });
          const datesSet = new Set(existingDates.map(d => d.date.toISOString()));

          const dupLogs = await prisma.attendanceLog.findMany({ where: { employeeId: dup.id } });
          for (const log of dupLogs) {
            if (!datesSet.has(log.date.toISOString())) {
              await prisma.attendanceLog.update({
                where: { id: log.id },
                data: { employeeId: keep.id }
              });
              attendanceMigrated++;
            }
          }
        }
        await prisma.employee.delete({ where: { id: dup.id } });
      }

      results.push({
        type: 'source-id',
        kept: `${keep.firstName} ${keep.lastName} (SourceID: ${sourceId})`,
        removed: remove.map(e => `${e.firstName} ${e.lastName} (${e.employeeCode})`),
        attendanceMigrated,
      });
    }

    logger.info(`Merged ${results.length} total duplicates`);

    res.json({
      message: `Merged ${results.length} duplicates`,
      results,
    });
  } catch (error) {
    logger.error('Fix failed:', error);
    res.status(500).json({ error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' });
  }
});

export default router;
