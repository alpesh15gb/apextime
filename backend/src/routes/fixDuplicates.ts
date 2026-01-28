import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

// Temporarily skipping auth for manual fix - remove this comment after use

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
