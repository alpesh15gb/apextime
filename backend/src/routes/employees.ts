import express from 'express';
import * as bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

const sanitizeId = (val: any) => {
  if (!val || val === '' || val === 'undefined') return null;
  return val;
};

const sanitizeNumber = (val: any) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

const sanitizeDate = (val: any) => {
  if (!val || val === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

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
        basicSalary,
        hra,
        otherAllowances,
        standardDeductions,
        isPFEnabled,
        isESIEnabled,
        isOTEnabled,
        otRateMultiplier,
        bankName,
        accountNumber,
        ifscCode,
        panNumber,
        aadhaarNumber,
      } = req.body;

<<<<<<< HEAD
      // Check if employee code already exists within this tenant
      const existing = await prisma.employee.findFirst({
=======
      // Check if employee code already exists
      const existing = await prisma.employee.findUnique({
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
        where: { employeeCode },
      });

      if (existing) {
        return res.status(400).json({ error: `Employee code '${employeeCode}' already exists` });
      }

<<<<<<< HEAD
      // Also check if User with same username exists in this tenant
      const existingUser = await prisma.user.findFirst({
=======
      // Also check if User with same username exists
      const existingUser = await prisma.user.findUnique({
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
        where: { username: employeeCode },
      });

      if (existingUser) {
        return res.status(400).json({ error: `User login '${employeeCode}' is already taken` });
      }

      const result = await prisma.$transaction(async (tx) => {
<<<<<<< HEAD
        const tenantId = (req as any).user.tenantId;
        const employee = await tx.employee.create({
          data: {
            tenantId,
=======
        const employee = await tx.employee.create({
          data: {
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
            employeeCode,
            firstName,
            lastName,
            email,
            phone,
            branchId: sanitizeId(branchId),
            departmentId: sanitizeId(departmentId),
            designationId: sanitizeId(designationId),
            categoryId: sanitizeId(categoryId),
            shiftId: sanitizeId(shiftId),
            deviceUserId: sanitizeId(deviceUserId),
            dateOfJoining: sanitizeDate(dateOfJoining),
            basicSalary: sanitizeNumber(basicSalary),
            hra: sanitizeNumber(hra),
            otherAllowances: sanitizeNumber(otherAllowances),
            standardDeductions: sanitizeNumber(standardDeductions),
            isPFEnabled: isPFEnabled === true || isPFEnabled === 'true',
            isESIEnabled: isESIEnabled === true || isESIEnabled === 'true',
            isOTEnabled: isOTEnabled === true || isOTEnabled === 'true',
            otRateMultiplier: sanitizeNumber(otRateMultiplier || 1.5),
            bankName,
            accountNumber,
            ifscCode,
            panNumber,
            aadhaarNumber,
          },
          include: {
            department: true,
            branch: true,
            shift: true,
            designation: true,
            category: true,
          },
        });

        // Automatically create User record for the employee
        const hashedPassword = await bcrypt.hash(employeeCode, 10);
        await tx.user.create({
          data: {
            username: employeeCode,
            password: hashedPassword,
            role: 'employee',
<<<<<<< HEAD
            employeeId: employee.id,
            tenantId: tenantId
=======
            employeeId: employee.id
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
          }
        });

        return employee;
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: error.message || 'Internal server error while creating employee' });
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
      basicSalary,
      hra,
      otherAllowances,
      standardDeductions,
      isPFEnabled,
      isESIEnabled,
      isOTEnabled,
      otRateMultiplier,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
      aadhaarNumber
    } = req.body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        branchId: sanitizeId(branchId),
        departmentId: sanitizeId(departmentId),
        designationId: sanitizeId(designationId),
        categoryId: sanitizeId(categoryId),
        shiftId: sanitizeId(shiftId),
        deviceUserId: sanitizeId(deviceUserId),
        dateOfJoining: sanitizeDate(dateOfJoining) || undefined,
        isActive: isActive !== undefined ? (isActive === true || isActive === 'true') : undefined,
        basicSalary: sanitizeNumber(basicSalary),
        hra: sanitizeNumber(hra),
        otherAllowances: sanitizeNumber(otherAllowances),
        standardDeductions: sanitizeNumber(standardDeductions),
        isPFEnabled: isPFEnabled !== undefined ? (isPFEnabled === true || isPFEnabled === 'true') : undefined,
        isESIEnabled: isESIEnabled !== undefined ? (isESIEnabled === true || isESIEnabled === 'true') : undefined,
        isOTEnabled: isOTEnabled !== undefined ? (isOTEnabled === true || isOTEnabled === 'true') : undefined,
        otRateMultiplier: sanitizeNumber(otRateMultiplier || 1.5),
        bankName,
        accountNumber,
        ifscCode,
        panNumber,
        aadhaarNumber,
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

    // Delete associated user first
    await prisma.user.deleteMany({
      where: { employeeId: id }
    });

    await prisma.employee.delete({
      where: { id },
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Import Bank Details
router.post('/import-bank-details', async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Records must be an array' });
    }

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const record of records) {
      try {
        const {
          employeeCode, bankName, accountNumber, ifscCode, panNumber,
          basicSalary, hra, otherAllowances, standardDeductions,
          isPFEnabled, isESIEnabled, otRateMultiplier
        } = record;

        if (!employeeCode) {
          continue;
        }

<<<<<<< HEAD
        const employee = await prisma.employee.findFirst({ where: { employeeCode } });
=======
        const employee = await prisma.employee.findUnique({ where: { employeeCode } });
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
        if (!employee) {
          results.failed++;
          results.errors.push(`Employee not found: ${employeeCode}`);
          continue;
        }

        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            bankName,
            accountNumber: accountNumber?.toString(),
            ifscCode,
            panNumber,
            basicSalary: (basicSalary !== undefined && basicSalary !== '') ? sanitizeNumber(basicSalary) : undefined,
            hra: (hra !== undefined && hra !== '') ? sanitizeNumber(hra) : undefined,
            otherAllowances: (otherAllowances !== undefined && otherAllowances !== '') ? sanitizeNumber(otherAllowances) : undefined,
            standardDeductions: (standardDeductions !== undefined && standardDeductions !== '') ? sanitizeNumber(standardDeductions) : undefined,
            otRateMultiplier: (otRateMultiplier !== undefined && otRateMultiplier !== '') ? sanitizeNumber(otRateMultiplier) : undefined,
            isPFEnabled: (isPFEnabled !== undefined && isPFEnabled !== '') ? (/true|yes|1/i.test(String(isPFEnabled))) : undefined,
            isESIEnabled: (isESIEnabled !== undefined && isESIEnabled !== '') ? (/true|yes|1/i.test(String(isESIEnabled))) : undefined
          }
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error updating ${record.employeeCode}: ${err.message}`);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Import bank error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Repair User Accounts (Create missing logins)
router.post('/repair-user-accounts', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true
      }
    });

    let createdCount = 0;

    for (const emp of employees) {
      if (!emp.employeeCode) continue;

      // Check if user exists linked to this employee OR with same username
      const userExists = await prisma.user.findFirst({
        where: {
          OR: [
            { employeeId: emp.id },
            { username: emp.employeeCode } // Case sensitive match typically
          ]
        }
      });

      if (!userExists) {
        const password = await bcrypt.hash(emp.employeeCode, 10);
        await prisma.user.create({
          data: {
<<<<<<< HEAD
            tenantId: emp.tenantId,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
            username: emp.employeeCode,
            password,
            role: 'employee',
            employeeId: emp.id
          }
        });
        createdCount++;
      }
    }

    res.json({ message: `Repaired ${createdCount} missing user accounts` });
  } catch (error) {
    console.error('Repair users error:', error);
    res.status(500).json({ error: 'Failed to repair user accounts' });
  }
});

export default router;
