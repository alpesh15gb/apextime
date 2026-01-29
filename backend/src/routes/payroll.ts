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
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0); // Last day of month
        const daysInMonth = endDate.getDate();

        // Get employees filtered by branch/dept
        const employeeWhere: any = { isActive: true };
        if (branchId) employeeWhere.branchId = branchId;
        if (departmentId) employeeWhere.departmentId = departmentId;

        const employees = await prisma.employee.findMany({
            where: employeeWhere,
            include: {
                attendanceLogs: {
                    where: {
                        date: { gte: startDate, lte: endDate }
                    }
                },
                leaveEntries: {
                    where: {
                        status: 'approved',
                        OR: [
                            { startDate: { lte: endDate }, endDate: { gte: startDate } }
                        ]
                    },
                    include: { leaveType: true }
                }
            }
        });

        const results = [];

        for (const emp of employees) {
            // 1. Calculate Attendance & LOP
            const actualPresentDays = emp.attendanceLogs.filter(l => l.status === 'present').length;

            // Calculate Unpaid Leaves (LOP)
            let lopDays = 0;
            emp.leaveEntries.forEach(leave => {
                if (!leave.leaveType.isPaid) {
                    // Calculate days within the current month
                    const start = leave.startDate < startDate ? startDate : leave.startDate;
                    const end = leave.endDate > endDate ? endDate : leave.endDate;
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    lopDays += diffDays;
                }
            });

            // Paid Days = Days in Month - Loss of Pay Days
            const paidDays = daysInMonth - lopDays;

            // 2. Base Components (Pro-rata)
            const basicPaid = (emp.basicSalary / daysInMonth) * paidDays;
            const hraPaid = (emp.hra / daysInMonth) * paidDays;
            const conveyancePaid = (emp.conveyance / daysInMonth) * paidDays;
            const medicalPaid = (emp.medicalAllowance / daysInMonth) * paidDays;
            const specialPaid = (emp.specialAllowance / daysInMonth) * paidDays;
            const otherAllowancesPaid = (emp.otherAllowances / daysInMonth) * paidDays;

            // Total Allowances (Fixed part)
            const allowancesPaid = hraPaid + conveyancePaid + medicalPaid + specialPaid + otherAllowancesPaid;

            // 3. Overtime Pay
            let otHours = 0;
            let otPay = 0;
            if (emp.isOTEnabled) {
                const monthlyFixedGross = emp.basicSalary + emp.hra + emp.conveyance + emp.medicalAllowance + emp.specialAllowance + emp.otherAllowances;
                const hourlyRate = monthlyFixedGross / (daysInMonth * 8);

                emp.attendanceLogs.forEach(log => {
                    if (log.workingHours && log.workingHours > 8) {
                        otHours += (log.workingHours - 8);
                    }
                });
                otPay = otHours * hourlyRate * (emp.otRateMultiplier || 1.5);
            }

            const grossSalary = basicPaid + allowancesPaid + otPay;

            // 4. Statutory Deductions (Employee Share)
            let pfDeduction = 0;
            let esiDeduction = 0;
            let ptDeduction = 0;

            if (emp.isPFEnabled) {
                // Provident Fund: 12% of Basic, capped at 1800 (12% of 15000 ceiling)
                const pfBasis = Math.min(basicPaid, 15000);
                pfDeduction = pfBasis * 0.12;
            }

            if (emp.isESIEnabled && grossSalary <= 21000) {
                // ESI: 0.75% of Gross
                esiDeduction = Math.ceil(grossSalary * 0.0075);
            }

            if (emp.isPTEnabled && grossSalary > 0) {
                // Professional Tax: Simplified fixed ₹200 if gross > 0
                ptDeduction = 200;
            }

            // 5. Employer Contributions
            let employerPF = emp.isPFEnabled ? (Math.min(basicPaid, 15000) * 0.12) : 0;
            let employerESI = (emp.isESIEnabled && grossSalary <= 21000) ? Math.ceil(grossSalary * 0.0325) : 0;

            // 6. Final Totals
            const totalDeductions = pfDeduction + esiDeduction + ptDeduction + emp.standardDeductions;
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
                    actualPresentDays,
                    lopDays,
                    paidDays,
                    basicPaid,
                    hraPaid,
                    conveyancePaid,
                    medicalPaid,
                    specialPaid,
                    allowancesPaid,
                    otHours,
                    otPay,
                    pfDeduction,
                    esiDeduction,
                    ptDeduction,
                    employerPF,
                    employerESI,
                    grossSalary,
                    totalDeductions,
                    netSalary: netSalary > 0 ? netSalary : 0,
                    status: 'generated',
                },
                create: {
                    employeeId: emp.id,
                    month: m,
                    year: y,
                    totalWorkingDays: daysInMonth,
                    actualPresentDays,
                    lopDays,
                    paidDays,
                    basicPaid,
                    hraPaid,
                    conveyancePaid,
                    medicalPaid,
                    specialPaid,
                    allowancesPaid,
                    otHours,
                    otPay,
                    pfDeduction,
                    esiDeduction,
                    ptDeduction,
                    employerPF,
                    employerESI,
                    grossSalary,
                    totalDeductions,
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
            conveyance,
            medicalAllowance,
            specialAllowance,
            otherAllowances,
            standardDeductions,
            isPFEnabled,
            isESIEnabled,
            isPTEnabled,
            isOTEnabled,
            otRateMultiplier
        } = req.body;

        await prisma.employee.update({
            where: { id: employeeId },
            data: {
                basicSalary: parseFloat(basicSalary || 0),
                hra: parseFloat(hra || 0),
                conveyance: parseFloat(conveyance || 0),
                medicalAllowance: parseFloat(medicalAllowance || 0),
                specialAllowance: parseFloat(specialAllowance || 0),
                otherAllowances: parseFloat(otherAllowances || 0),
                standardDeductions: parseFloat(standardDeductions || 0),
                isPFEnabled: !!isPFEnabled,
                isESIEnabled: !!isESIEnabled,
                isPTEnabled: !!isPTEnabled,
                isOTEnabled: !!isOTEnabled,
                otRateMultiplier: parseFloat(otRateMultiplier || '1.5'),
            }
        });

        res.json({ message: 'Salary structure updated' });
    } catch (error) {
        logger.error('Update salary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark payroll as paid
router.post('/process-pay', async (req, res) => {
    try {
        const { month, year, branchId, departmentId } = req.body;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and Year are required' });
        }

        const where: any = {
            month: parseInt(month),
            year: parseInt(year),
            status: 'generated'
        };

        if (branchId) where.employee = { branchId };
        if (departmentId) where.employee = { ...where.employee, departmentId };

        const result = await prisma.payroll.updateMany({
            where,
            data: {
                status: 'paid',
                paidAt: new Date(),
            }
        });

        res.json({ message: `Successfully processed payment for ${result.count} records`, count: result.count });
    } catch (error) {
        logger.error('Process pay error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
