import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get all departments
router.get('/', async (req, res) => {
  try {
    const { branchId, isActive } = req.query;

    const where: any = {
      tenantId: (req as any).user.tenantId
    };
    if (branchId) where.branchId = branchId as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const departments = await prisma.department.findMany({
      where,
      include: {
        branch: true,
        managers: true, // Include managers details (M-N)
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        branch: true,
        employees: true,
        managers: true,
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to promote employees to manager
const promoteToManagers = async (employeeIds: string[]) => {
  if (!employeeIds || employeeIds.length === 0) return;
  try {
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: true }
    });

    for (const employee of employees) {
      if (employee.user && employee.user.role === 'employee') {
        await prisma.user.update({
          where: { id: employee.user.id },
          data: { role: 'manager' }
        });
      }
    }
  } catch (e) {
    console.error("Failed to auto-promote managers:", e);
  }
};

// Create department
router.post('/', async (req, res) => {
  try {
    const { name, code, branchId, managerIds } = req.body;
    // managerIds should be an array of strings

    console.log('Creating department with managers:', managerIds);

    const managersConnect = (Array.isArray(managerIds) && managerIds.length > 0)
      ? { connect: managerIds.map((id: string) => ({ id })) }
      : undefined;

    const department = await prisma.department.create({
      data: {
        tenantId: (req as any).user.tenantId,
        name,
        code,
        branchId,
        managers: managersConnect,
      },
      include: {
        branch: true,
        managers: true,
      },
    });

    if (Array.isArray(managerIds)) await promoteToManagers(managerIds);

    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, branchId, isActive, managerIds } = req.body;

    // Handle managerIds update (replace existing)
    let managersUpdate = {};
    if (Array.isArray(managerIds)) {
      managersUpdate = {
        set: managerIds.map((mid: string) => ({ id: mid }))
      };
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        branchId,
        isActive,
        managers: managersUpdate,
      },
      include: {
        branch: true,
        managers: true,
      },
    });

    if (Array.isArray(managerIds)) await promoteToManagers(managerIds);

    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id },
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
