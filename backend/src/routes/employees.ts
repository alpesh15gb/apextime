import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all employees
router.get('/', async (req, res) => {
  try {
    const {
      search,
      departmentId,
      branchId,
      shiftId,
      isActive,
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { employeeCode: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (departmentId) where.departmentId = departmentId as string;
    if (branchId) where.branchId = branchId as string;
    if (shiftId) where.shiftId = shiftId as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          branch: true,
          shift: true,
          designation: true,
          category: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        branch: true,
        shift: true,
        designation: true,
        category: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update employees
router.post('/bulk-update', async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No employee IDs provided' });
    }

    const updateData: any = {};
    if (data.branchId !== undefined) updateData.branchId = data.branchId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.shiftId !== undefined) updateData.shiftId = data.shiftId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.designationId !== undefined) updateData.designationId = data.designationId;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

    const result = await prisma.employee.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    });

    res.json({ message: `Successfully updated ${result.count} employees`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create employee
router.post(
  '/',
  [
    body('employeeCode').notEmpty().withMessage('Employee code is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        branchId,
        departmentId,
        designationId,
        categoryId,
        shiftId,
        deviceUserId,
        dateOfJoining,
      } = req.body;

      // Check if employee code already exists
      const existing = await prisma.employee.findUnique({
        where: { employeeCode },
      });

      if (existing) {
        return res.status(400).json({ error: 'Employee code already exists' });
      }

      const employee = await prisma.employee.create({
        data: {
          employeeCode,
          firstName,
          lastName,
          email,
          phone,
          branchId,
          departmentId,
          designationId,
          categoryId,
          shiftId,
          deviceUserId,
          dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        },
        include: {
          department: true,
          branch: true,
          shift: true,
          designation: true,
          category: true,
        },
      });

      res.status(201).json(employee);
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      branchId,
      departmentId,
      designationId,
      categoryId,
      shiftId,
      deviceUserId,
      dateOfJoining,
      isActive,
    } = req.body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        branchId,
        departmentId,
        designationId,
        categoryId,
        shiftId,
        deviceUserId,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        isActive,
      },
      include: {
        department: true,
        branch: true,
        shift: true,
        designation: true,
        category: true,
      },
    });

    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id },
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
