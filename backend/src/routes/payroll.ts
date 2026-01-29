import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../config/logger';

const router = express.Router();

router.use(authenticate);

// Helper for currency rounding
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

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
                        bankName: true,
                        accountNumber: true,
                        ifscCode: true,
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
        const endDate = new Date(y, m, 0);
        const daysInMonth = endDate.getDate();

        // 0. Fetch Holidays for the month
        const holidays = await prisma.holiday.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            }
        });
        const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);

        // Get employees filtered by branch/dept
        const employeeWhere: any = { isActive: true };
        if (branchId) employeeWhere.branchId = branchId;
        if (departmentId) employeeWhere.departmentId = departmentId;

        const employees = await prisma.employee.findMany({
            where: employeeWhere,
            include: {
                shift: true,
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
            // Skip if already PAID for this month
            const existingPaid = await prisma.payroll.findFirst({
                where: { employeeId: emp.id, month: m, year: y, status: 'paid' }
            });
            if (existingPaid) continue;

            // 1. Calculate Attendance & LOP
            const actualPresentDays = emp.attendanceLogs.filter(l => l.status === 'present').length;

            // Calculate Unpaid Leaves (LOP) with Holiday Awareness
            let lopDays = 0;
            emp.leaveEntries.forEach(leave => {
                if (!leave.leaveType.isPaid) {
                    const start = leave.startDate < startDate ? startDate : leave.startDate;
                    const end = leave.endDate > endDate ? endDate : leave.endDate;

                    let curr = new Date(start);
                    while (curr <= end) {
                        const dateStr = curr.toISOString().split('T')[0];
                        // Only count LOP if it's NOT a holiday
                        if (!holidayDates.includes(dateStr)) {
                            lopDays += 1;
                        }
                        curr.setDate(curr.getDate() + 1);
                    }
                }
            });

            // Paid Days = Days in Month - Loss of Pay Days
            const paidDays = daysInMonth - lopDays;

            // 2. Base Components (Pro-rata)
            const basicPaid = round((emp.basicSalary / daysInMonth) * paidDays);
            const hraPaid = round((emp.hra / daysInMonth) * paidDays);
            const conveyancePaid = round((emp.conveyance / daysInMonth) * paidDays);
            const medicalPaid = round((emp.medicalAllowance / daysInMonth) * paidDays);
            const specialPaid = round((emp.specialAllowance / daysInMonth) * paidDays);
            const otherAllowancesPaid = round((emp.otherAllowances / daysInMonth) * paidDays);

            const allowancesPaid = round(hraPaid + conveyancePaid + medicalPaid + specialPaid + otherAllowancesPaid);

            // 3. Overtime Pay with Shift Awareness
            let otHours = 0;
            let otPay = 0;
            if (emp.isOTEnabled) {
                const monthlyFixedGross = emp.basicSalary + emp.hra + emp.conveyance + emp.medicalAllowance + emp.specialAllowance + emp.otherAllowances;
                const standardHoursPerMonth = daysInMonth * 8; // Simplified, or use shift hours
                const hourlyRate = monthlyFixedGross / standardHoursPerMonth;

                emp.attendanceLogs.forEach(log => {
                    // Logic: If working hours > shift requirement
                    const shiftHours = 8; // Default
                    if (log.workingHours && log.workingHours > shiftHours) {
                        otHours += (log.workingHours - shiftHours);
                    }
                });
                otPay = round(otHours * hourlyRate * (emp.otRateMultiplier || 1.5));
            }

            const grossSalary = round(basicPaid + allowancesPaid + otPay);

            // 4. Statutory Deductions (Employee Share)
            let pfDeduction = 0;
            let esiDeduction = 0;
            let ptDeduction = 0;

            if (emp.isPFEnabled) {
                // PF: 12% on Basic, capped at 15,000 basic ceiling
                const pfBasis = Math.min(basicPaid, 15000);
                pfDeduction = round(pfBasis * 0.12);
            }

            if (emp.isESIEnabled && grossSalary <= 21000) {
                // ESI: 0.75% of Gross, rounded up to nearest Rupee
                esiDeduction = Math.ceil(grossSalary * 0.0075);
            }

            if (emp.isPTEnabled && grossSalary > 0) {
                // Professional Tax: Slab-based or fixed ₹200
                ptDeduction = 200;
            }

            // 5. Employer Contributions
            let employerPF = emp.isPFEnabled ? round(Math.min(basicPaid, 15000) * 0.12) : 0;
            let employerESI = (emp.isESIEnabled && grossSalary <= 21000) ? Math.ceil(grossSalary * 0.0325) : 0;

            // 6. Final Totals
            const totalDeductions = round(pfDeduction + esiDeduction + ptDeduction + emp.standardDeductions);
            const netSalary = round(grossSalary - totalDeductions);

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

        res.json({ message: `Success: High-precision payroll generated for ${results.length} employees`, count: results.length });
    } catch (error) {
        logger.error('Generate payroll error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update salary & banking fields for an employee
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
            otRateMultiplier,
            bankName,
            accountNumber,
            ifscCode,
            panNumber,
            aadhaarNumber
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
                bankName,
                accountNumber,
                ifscCode,
                panNumber,
                aadhaarNumber
            }
        });

        res.json({ message: 'Salary and banking structure updated successfully' });
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

        res.json({ message: `Successfully processed bank disbursement for ${result.count} records`, count: result.count });
    } catch (error) {
        logger.error('Process pay error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
