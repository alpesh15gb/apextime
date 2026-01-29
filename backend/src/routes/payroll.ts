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
            const presentDays = emp.attendanceLogs.filter(l => l.status === 'present').length;
            const absentDays = daysInMonth - presentDays;

            // 1. Calculate OT Hours and Pay
            let otHours = 0;
            let otPay = 0;
            if (emp.isOTEnabled) {
                // Calculate hourly rate based on standard 8hr day
                const monthlyFixedGross = emp.basicSalary + emp.hra + emp.totalAllowances;
                const hourlyRate = monthlyFixedGross / (daysInMonth * 8);

                emp.attendanceLogs.forEach(log => {
                    if (log.workingHours && log.workingHours > 8) {
                        const extra = log.workingHours - 8;
                        otHours += extra;
                    }
                });
                otPay = otHours * hourlyRate * (emp.otRateMultiplier || 1.5);
            }

            // 2. Base Salary Calculations (Pro-rata)
            const basicPaid = (emp.basicSalary / daysInMonth) * presentDays;
            const hraPaid = (emp.hra / daysInMonth) * presentDays;
            const allowancesPaid = (emp.totalAllowances / daysInMonth) * presentDays;

            const grossSalary = basicPaid + hraPaid + allowancesPaid + otPay;

            // 3. Statutory Deductions (Employee Share)
            let pfDeduction = 0;
            let esiDeduction = 0;

            if (emp.isPFEnabled) {
                // Standard 12% of Basic
                pfDeduction = Math.min(basicPaid * 0.12, 1800); // Usually capped at 1800 (12% of 15000)
            }

            if (emp.isESIEnabled && grossSalary <= 21000) {
                // Standard 0.75% of Gross
                esiDeduction = Math.ceil(grossSalary * 0.0075);
            }

            // 4. Employer Contributions
            let employerPF = emp.isPFEnabled ? Math.min(basicPaid * 0.12, 1800) : 0;
            let employerESI = (emp.isESIEnabled && grossSalary <= 21000) ? Math.ceil(grossSalary * 0.0325) : 0;

            // 5. Net Salary Calculation
            // Net = Gross - PF - ESI - Other Standard Deductions
            const totalDeductions = pfDeduction + esiDeduction + emp.standardDeductions;
            const netSalary = grossSalary - totalDeductions;

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
                    basicPaid,
                    hraPaid,
                    allowancesPaid,
                    otHours,
                    otPay,
                    pfDeduction,
                    esiDeduction,
                    employerPF,
                    employerESI,
                    grossSalary,
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
                    basicPaid,
                    hraPaid,
                    allowancesPaid,
                    otHours,
                    otPay,
                    pfDeduction,
                    esiDeduction,
                    employerPF,
                    employerESI,
                    grossSalary,
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
        const {
            basicSalary,
            hra,
            totalAllowances,
            standardDeductions,
            isPFEnabled,
            isESIEnabled,
            isOTEnabled,
            otRateMultiplier
        } = req.body;

        await prisma.employee.update({
            where: { id: employeeId },
            data: {
                basicSalary: parseFloat(basicSalary),
                hra: parseFloat(hra),
                totalAllowances: parseFloat(totalAllowances),
                standardDeductions: parseFloat(standardDeductions),
                isPFEnabled: Boolean(isPFEnabled),
                isESIEnabled: Boolean(isESIEnabled),
                isOTEnabled: Boolean(isOTEnabled),
                otRateMultiplier: parseFloat(otRateMultiplier || '1.5'),
            }
        });

        res.json({ message: 'Salary structure updated' });
    } catch (error) {
        logger.error('Update salary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
