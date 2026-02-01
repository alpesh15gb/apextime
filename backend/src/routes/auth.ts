import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';

const router = express.Router();

// Login
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('companyCode').notEmpty().withMessage('Company code is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, companyCode } = req.body;

      // Find tenant first
      const tenant = await prisma.tenant.findUnique({
        where: { slug: companyCode },
      });

      if (!tenant || !tenant.isActive) {
        return res.status(401).json({ error: 'Invalid company code or inactive tenant' });
      }

      // Find user within this tenant
      const user = await prisma.user.findUnique({
        where: {
          username_tenantId: {
            username,
            tenantId: tenant.id
          }
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT with tenantId
      const secret = process.env.JWT_SECRET || 'apextime-secret-key-2026';
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          employeeId: user.employeeId,
          tenantId: tenant.id
        },
        secret,
        { expiresIn: '24h' }
      );

      // Fetch employee details if linked
      let employeeName = null;
      let firstName = null;
      let lastName = null;

      if (user.employeeId) {
        const emp = await prisma.employee.findUnique({ where: { id: user.employeeId } });
        if (emp) {
          firstName = emp.firstName;
          lastName = emp.lastName;
          employeeName = `${emp.firstName} ${emp.lastName}`;
        }
      }

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: firstName,
          lastName: lastName,
          fullName: employeeName,
          role: user.role,
          employeeId: user.employeeId,
          tenantId: tenant.id,
          tenantName: tenant.name,
          modules: tenant.modules
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword, companyCode } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { slug: companyCode },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const user = await prisma.user.findUnique({
      where: {
        username_tenantId: {
          username,
          tenantId: tenant.id
        }
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
