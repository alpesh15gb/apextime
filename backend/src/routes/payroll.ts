import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../config/logger';

const router = express.Router();

router.use(authenticate);

// Get payroll for a specific month/year
router.get('/', async (req, res) => {
    try {
        const { month, year, branchId, departmentId } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and Year are required' });
        }

        const where: any = {
            month: parseInt(month as string),
            year: parseInt(year as string),
        };

        if (branchId) where.employee = { branchId: branchId as string };
        if (departmentId) where.employee = { ...where.employee, departmentId: departmentId as string };

        const payrolls = await prisma.payroll.findMany({
            where,
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                    }
                }
            }
        });

        res.json(payrolls);
    } catch (error) {
        logger.error('Get payroll error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate payroll for a month
router.post('/generate', async (req, res) => {
    try {
        const { month, year, branchId, departmentId } = req.body;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and Year are required' });
        }

        const m = parseInt(month);
        const y = parseInt(year);

        // Get employees filtered by branch/dept
        const employeeWhere: any = { isActive: true };
        if (branchId) employeeWhere.branchId = branchId;
        if (departmentId) employeeWhere.departmentId = departmentId;

        const employees = await prisma.employee.findMany({
            where: employeeWhere,
            include: {
                attendanceLogs: {
                    where: {
                        date: {
                            gte: new Date(y, m - 1, 1),
                            lte: new Date(y, m, 0),
                        }
                    }
                }
            }
        });

        const daysInMonth = new Date(y, m, 0).getDate();
        const results = [];

        for (const emp of employees) {
            // Basic logic: Present days = present status + (lateArrival < 30 ? 1 : 0.5) etc
            // For now, let's just count 'present' status
            const presentDays = emp.attendanceLogs.filter(l => l.status === 'present').length;
            const lateDays = emp.attendanceLogs.filter(l => l.lateArrival > 0).length;
            const absentDays = daysInMonth - presentDays;

            // Salary math
            const perDaySalary = (emp.basicSalary + emp.hra + emp.totalAllowances) / daysInMonth;
            const basicPaid = (emp.basicSalary / daysInMonth) * presentDays;
            const hraPaid = (emp.hra / daysInMonth) * presentDays;
            const allowancesPaid = (emp.totalAllowances / daysInMonth) * presentDays;

            // Simple late deduction: $10 per late day (example)
            const lateDeduction = lateDays * 10;
            const totalDeductions = emp.standardDeductions + lateDeduction;

            const netSalary = (basicPaid + hraPaid + allowancesPaid) - totalDeductions;

            // Upsert payroll record
            const payroll = await prisma.payroll.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId: emp.id,
                        month: m,
                        year: y,
                    }
                },
                update: {
                    totalWorkingDays: daysInMonth,
                    presentDays,
                    absentDays,
                    lateDays,
                    basicPaid,
                    hraPaid,
                    allowancesPaid,
                    deductions: totalDeductions,
                    netSalary: netSalary > 0 ? netSalary : 0,
                    status: 'generated',
                },
                create: {
                    employeeId: emp.id,
                    month: m,
                    year: y,
                    totalWorkingDays: daysInMonth,
                    presentDays,
                    absentDays,
                    lateDays,
                    basicPaid,
                    hraPaid,
                    allowancesPaid,
                    deductions: totalDeductions,
                    netSalary: netSalary > 0 ? netSalary : 0,
                    status: 'generated',
                }
            });
            results.push(payroll);
        }

        res.json({ message: `Payroll generated for ${results.length} employees`, count: results.length });
    } catch (error) {
        logger.error('Generate payroll error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update salary fields for an employee
router.put('/salary/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { basicSalary, hra, totalAllowances, standardDeductions } = req.body;

        await prisma.employee.update({
            where: { id: employeeId },
            data: {
                basicSalary: parseFloat(basicSalary),
                hra: parseFloat(hra),
                totalAllowances: parseFloat(totalAllowances),
                standardDeductions: parseFloat(standardDeductions),
            }
        });

        res.json({ message: 'Salary structure updated' });
    } catch (error) {
        logger.error('Update salary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
