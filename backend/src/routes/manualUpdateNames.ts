import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

// Manual mapping based on user input
// Format: deviceUserId -> { firstName, lastName }
const MANUAL_NAME_MAP: Record<string, { firstName: string; lastName: string }> = {
  // CH Satyanarayana
  '38': { firstName: 'CH', lastName: 'Satyanarayana' },
  '18': { firstName: 'CH', lastName: 'Satyanarayana' },

  // B Sainath
  '36': { firstName: 'B', lastName: 'Sainath' },
  '40': { firstName: 'B', lastName: 'Sainath' },

  // A Lakshman Rao
  '37': { firstName: 'A', lastName: 'Lakshman Rao' },
  '65': { firstName: 'A', lastName: 'Lakshman Rao' },

  // CH.Praveen Kumar
  '8': { firstName: 'CH.', lastName: 'Praveen Kumar' },
  '72': { firstName: 'CH.', lastName: 'Praveen Kumar' },

  // D Baji Babu
  '98': { firstName: 'D', lastName: 'Baji Babu' },
  '102': { firstName: 'D', lastName: 'Baji Babu' },

  // Ganesh
  '64': { firstName: 'Ganesh', lastName: '' },
  '7': { firstName: 'Ganesh', lastName: '' },

  // G Sai Kumar
  '95': { firstName: 'G', lastName: 'Sai Kumar' },

  // G Srinivasa Rao
  '45': { firstName: 'G', lastName: 'Srinivasa Rao' },
  '15': { firstName: 'G', lastName: 'Srinivasa Rao' },

  // Gundla.Suresh
  '96': { firstName: 'Gundla.', lastName: 'Suresh' },
  '92': { firstName: 'Gundla.', lastName: 'Suresh' },

  // KARNA SREENIVASULU
  '103': { firstName: 'KARNA', lastName: 'SREENIVASULU' },
  '100': { firstName: 'KARNA', lastName: 'SREENIVASULU' },

  // Kallapalli Suresh Kumar
  '101': { firstName: 'Kallapalli', lastName: 'Suresh Kumar' },

  // Kola Ramu
  '6': { firstName: 'Kola', lastName: 'Ramu' },

  // P V N Somayajulu
  '53': { firstName: 'P V N', lastName: 'Somayajulu' },
  // Note: Code '8' is CH.Praveen Kumar (defined above)
};

// GET /manual-update-names - Show what will be updated
router.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } }
    });

    const toUpdate = [];
    for (const emp of employees) {
      const newName = MANUAL_NAME_MAP[emp.deviceUserId!];
      if (!newName) continue;

      const currentName = `${emp.firstName} ${emp.lastName}`.trim();
      const targetName = `${newName.firstName} ${newName.lastName}`.trim();

      if (currentName !== targetName) {
        toUpdate.push({
          deviceUserId: emp.deviceUserId,
          currentName,
          newName: targetName,
          employeeCode: emp.employeeCode
        });
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manual Name Update</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; }
          .employee { background: #f5f5f5; padding: 10px; margin: 8px 0; border-radius: 5px; }
          .current { color: red; }
          .new { color: green; font-weight: bold; }
          button { background: #007bff; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #0056b3; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
          .stats { background: #d1ecf1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Manual Name Update</h1>
        <div class="stats">
          <strong>${toUpdate.length} employees</strong> will be updated
        </div>
        <form method="POST" action="">
          <button type="submit">Apply Manual Updates</button>
        </form>
        <div style="margin-top: 20px;">
          ${toUpdate.map(e => `
            <div class="employee">
              <code>${e.deviceUserId}</code> |
              Current: <span class="current">${e.currentName}</span> →
              New: <span class="new">${e.newName}</span>
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

// POST /manual-update-names - Apply manual updates
router.post('/', async (req, res) => {
  try {
    logger.info('Starting manual name updates...');

    const employees = await prisma.employee.findMany({
      where: { deviceUserId: { not: null } }
    });

    const results: { code: string; old: string; new: string; status: string }[] = [];

    for (const emp of employees) {
      const newName = MANUAL_NAME_MAP[emp.deviceUserId!];
      if (!newName) continue;

      const currentName = `${emp.firstName} ${emp.lastName}`.trim();
      const targetName = `${newName.firstName} ${newName.lastName}`.trim();

      if (currentName === targetName) {
        continue; // Already correct
      }

      try {
        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            firstName: newName.firstName,
            lastName: newName.lastName
          }
        });

        results.push({
          code: emp.deviceUserId!,
          old: currentName,
          new: targetName,
          status: 'updated'
        });
        logger.info(`Updated ${emp.deviceUserId}: "${currentName}" → "${targetName}"`);
      } catch (e) {
        results.push({
          code: emp.deviceUserId!,
          old: currentName,
          new: targetName,
          status: 'error'
        });
      }
    }

    res.json({
      message: `Updated ${results.filter(r => r.status === 'updated').length} employees`,
      updated: results.filter(r => r.status === 'updated').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    });
  } catch (error) {
    logger.error('Manual update failed:', error);
    res.status(500).json({ error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' });
  }
});

export default router;
