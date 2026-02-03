import { prisma } from '../config/database';
import { Loan, Employee, Payroll, AttendanceLog, LeaveEntry } from '@prisma/client';
import { PTCalculator } from './ptCalculator';
import { TDSCalculator } from './tdsCalculator';

export interface PayrollResult {
    success: boolean;
    data?: any;
    error?: string;
    metrics?: {
        totalEarnings: number;
        totalDeductions: number;
        netSalary: number;
    };
}

export class PayrollEngine {
    /**
     * Core calculation for a single employee's monthly payroll
     */
    static async calculateEmployeePayroll(
        employeeId: string,
        month: number,
        year: number,
        payrollRunId: string
    ): Promise<PayrollResult> {
        try {
            const employee = await prisma.employee.findUnique({
                where: { id: employeeId },
                include: {
                    attendanceLogs: {
                        where: {
                            date: {
                                gte: new Date(year, month - 1, 1),
                                lte: new Date(year, month, 0)
                            }
                        }
                    },
                    leaveEntries: {
                        where: {
                            status: 'approved',
                            startDate: { lte: new Date(year, month, 0) },
                            endDate: { gte: new Date(year, month - 1, 1) }
                        },
                        include: { leaveType: true }
                    },
                    salaryComponents: {
                        where: { isActive: true },
                        include: { component: true }
                    },
                    location: true,
                    branch: {
                        include: { location: true }
                    },
                    loans: {
                        where: {
                            status: 'ACTIVE',
                            startDate: { lte: new Date(year, month, 0) }
                        }
                    }
                }
            });

            if (!employee) return { success: false, error: 'Employee not found' };

            // 1. Calculate Days
            const daysInMonth = new Date(year, month, 0).getDate();

            // Unified Day Counting from Attendance Logs
            const presentDays = employee.attendanceLogs.filter(l => l.status === 'present').length;
            const weeklyOffs = employee.attendanceLogs.filter(l => l.status === 'weekly_off').length;
            const holidays = employee.attendanceLogs.filter(l => l.status === 'holiday').length;
            const leaves = employee.attendanceLogs.filter(l => l.status === 'leave_paid').length;
            const halfDayCount = employee.attendanceLogs.filter(l => l.status === 'half_day').length;

            let effectivePresentDays = presentDays + weeklyOffs + holidays + leaves + (halfDayCount * 0.5);

            // Fallback: If no logs exist (e.g. Sync Failed or Manual Employee), assume Full Month
            if (employee.attendanceLogs.length === 0 && employee.isActive) {
                effectivePresentDays = daysInMonth;
            }

            const lopDays = Math.max(0, daysInMonth - effectivePresentDays);
            const paidDays = Math.max(0, daysInMonth - lopDays);

            // 2. Calculate Earnings
            let totalEarnings = 0;
            const components: any = {};

            // Hybrid Approach: Use flat fields from Employee record if available (Standard Mode)
            if (employee.basicSalary && employee.basicSalary > 0) {
                const amount = (employee.basicSalary / daysInMonth) * paidDays;
                components['BASIC'] = amount;
                totalEarnings += amount;
            }
            if (employee.hra && employee.hra > 0) {
                const amount = (employee.hra / daysInMonth) * paidDays;
                components['HRA'] = amount;
                totalEarnings += amount;
            }
            if (employee.otherAllowances && employee.otherAllowances > 0) {
                const amount = (employee.otherAllowances / daysInMonth) * paidDays;
                components['ALLOWANCES'] = amount;
                totalEarnings += amount;
            }

            // Advanced Mode: Add dynamic components (e.g. Bonuses, Special deductions)

            employee.salaryComponents.forEach(esc => {
                if (esc.component.type === 'EARNING') {
                    // Pro-rate salary based on paid days
                    const amount = (esc.monthlyAmount / daysInMonth) * paidDays;
                    components[esc.component.code] = (components[esc.component.code] || 0) + amount;
                    totalEarnings += amount;
                }
            });

            // 2b. Overtime (OT) Calculation
            let otAmount = 0;
            let totalOtHours = 0;
            if (employee.isOTEnabled) {
                employee.attendanceLogs.forEach(log => {
                    if (log.workingHours && log.shiftStart && log.shiftEnd) {
                        const shiftDuration = (log.shiftEnd.getTime() - log.shiftStart.getTime()) / (1000 * 60 * 60);
                        const overtime = Math.max(0, log.workingHours - shiftDuration);
                        totalOtHours += overtime;
                    }
                });

                if (totalOtHours > 0 && paidDays > 0) {
                    const hourlyRate = (totalEarnings / (paidDays * 8));
                    otAmount = totalOtHours * hourlyRate * (employee.otRateMultiplier || 1.5);
                    totalEarnings += otAmount;
                    components['OVERTIME'] = otAmount;
                }
            }

            // 3. Calculate Statutory Deductions (Standard Indian Rules)
            let totalDeductions = 0;

            // PF Calculation
            if (employee.isPFEnabled) {
                const basic = components['BASIC'] || 0;
                const pfWage = Math.min(basic, 15000);

                // Employee Share (12%)
                const pfAmount = Math.round(pfWage * 0.12);
                components['PF_EMP'] = pfAmount;
                totalDeductions += pfAmount;

                // Employer Share (12% = 8.33% EPS + 3.67% EPF)
                components['PF_ER'] = Math.round(pfWage * 0.12);
            }

            // ESI Calculation
            if (employee.isESIEnabled && totalEarnings <= 21000) {
                // Employee Share (0.75%)
                const esiAmount = Math.ceil(totalEarnings * 0.0075);
                components['ESI_EMP'] = esiAmount;
                totalDeductions += esiAmount;

                // Employer Share (3.25%)
                components['ESI_ER'] = Math.ceil(totalEarnings * 0.0325);
            }

            // PT Calculation (Multi-State Compliance)
            if (employee.isPTEnabled) {
                const ptAmount = PTCalculator.calculatePT(employee.state, totalEarnings);
                components['PT'] = ptAmount;
                totalDeductions += ptAmount;
            }

            // 4. Loan Deductions
            let totalLoanDeduction = 0;
            const loanDeductionsToCreate: any[] = [];

            if (employee.loans && employee.loans.length > 0) {
                for (const loan of employee.loans) {
                    // Check if loan is fully paid (double check)
                    if (loan.balanceAmount <= 0) continue;

                    // Determine deduction amount (min of EMI or remaining balance)
                    // You might want to skip if Date < startDate (handled in query)
                    // Also check if loan tenure is exceeded? (Implicit via balance)

                    let deduction = loan.monthlyDeduction;
                    if (deduction > loan.balanceAmount) {
                        deduction = loan.balanceAmount;
                    }

                    // Don't deduct more than Net Salary?
                    // Usually Loans are statutory/contractual, so they take priority 
                    // But we can limit it. For now, deduct full.

                    totalLoanDeduction += deduction;
                    totalDeductions += deduction;

                    loanDeductionsToCreate.push({
                        loanId: loan.id,
                        amount: deduction
                    });
                }
            }

            // 5. TDS Calculation (Income Tax)
            let tdsAmount = 0;
            try {
                // Fetch employee's TDS declaration for current FY
                const currentFY = month >= 4 ? `${year}-${(year + 1) % 100}` : `${year - 1}-${year % 100}`;
                const tdsDeclaration = await prisma.tDSDeclaration.findFirst({
                    where: {
                        employeeId,
                        financialYear: currentFY,
                        status: { in: ['SUBMITTED', 'APPROVED'] }
                    }
                });

                if (tdsDeclaration) {
                    // Calculate annual salary projection
                    const basicAnnual = (components['BASIC'] || 0) * 12;
                    const hraAnnual = (components['HRA'] || 0) * 12;
                    const allowancesAnnual = ((components['ALLOWANCES'] || 0) + otAmount) * 12;

                    const salaryBreakup = {
                        basicAnnual,
                        hraAnnual,
                        allowancesAnnual,
                        otherEarnings: 0
                    };

                    const declaration = {
                        ppf: tdsDeclaration.ppf,
                        elss: tdsDeclaration.elss,
                        lifeInsurance: tdsDeclaration.lifeInsurance,
                        homeLoanPrincipal: tdsDeclaration.homeLoanPrincipal,
                        tuitionFees: tdsDeclaration.tuitionFees,
                        nsc: tdsDeclaration.nsc,
                        section80D: tdsDeclaration.section80D,
                        section80E: tdsDeclaration.section80E,
                        section80G: tdsDeclaration.section80G,
                        section24: tdsDeclaration.section24,
                        rentPaid: tdsDeclaration.rentPaid,
                        taxRegime: tdsDeclaration.taxRegime as 'OLD' | 'NEW'
                    };

                    tdsAmount = TDSCalculator.calculateMonthlyTDS(salaryBreakup, declaration, month);
                    components['TDS'] = tdsAmount;
                    totalDeductions += tdsAmount;
                }
            } catch (tdsError) {
                console.error('TDS Calculation Error:', tdsError);
                // Continue without TDS if calculation fails
            }

            // 6. Gratuity Accrual (4.81% of Basic)
            const gratuityAccrual = Math.round((components['BASIC'] || 0) * 0.0481);
            components['GRATUITY'] = gratuityAccrual;

            // 7. Fetch Approved Reimbursements for this month
            let reimbursementAmount = 0;
            try {
                const reimbursements = await prisma.reimbursementEntry.findMany({
                    where: {
                        employeeId,
                        status: 'APPROVED',
                        payrollId: null, // Not yet paid
                        billDate: {
                            gte: new Date(year, month - 1, 1),
                            lte: new Date(year, month, 0)
                        }
                    }
                });

                reimbursementAmount = reimbursements.reduce((sum, r) => sum + r.amount, 0);
                if (reimbursementAmount > 0) {
                    totalEarnings += reimbursementAmount;
                    components['REIMBURSEMENTS'] = reimbursementAmount;
                }
            } catch (reimbError) {
                console.error('Reimbursement Fetch Error:', reimbError);
            }

            const netSalary = Math.round(totalEarnings - totalDeductions);

            // 8. Save to Database
            const allowancesPaid = Math.round(totalEarnings - (components['BASIC'] || 0) - (components['HRA'] || 0) - otAmount);

            const tenantId = employee.tenantId;
            const payroll = await prisma.payroll.upsert({
                where: {
                    employeeId_month_year_tenantId: {
                        employeeId,
                        month,
                        year,
                        tenantId
                    }
                },
                update: {
                    totalWorkingDays: daysInMonth,
                    actualPresentDays: effectivePresentDays,
                    lopDays,
                    paidDays,
                    grossSalary: Math.round(totalEarnings),
                    totalDeductions: Math.round(totalDeductions),
                    netSalary: netSalary,
                    payrollRun: payrollRunId ? { connect: { id: payrollRunId } } : undefined,
                    status: 'generated',

                    // Earnings
                    basicPaid: Math.round(components['BASIC'] || 0),
                    hraPaid: Math.round(components['HRA'] || 0),
                    allowancesPaid: Math.max(0, allowancesPaid),
                    otHours: totalOtHours,
                    otPay: Math.round(otAmount),
                    bonus: Math.round(components['BONUS'] || 0),
                    incentives: Math.round(components['INCENTIVES'] || 0),
                    leaveEncashment: Math.round(components['LEAVE_ENCASHMENT'] || 0),
                    reimbursements: Math.round(reimbursementAmount),
                    arrears: Math.round(components['ARREARS'] || 0),

                    // Deductions
                    pfDeduction: components['PF_EMP'] || 0,
                    esiDeduction: components['ESI_EMP'] || 0,
                    ptDeduction: components['PT'] || 0,
                    tdsDeduction: tdsAmount,
                    loanDeduction: totalLoanDeduction,
                    advanceDeduction: Math.round(components['ADVANCE'] || 0),
                    otherDeductions: Math.round(components['OTHER_DED'] || 0),

                    // Employer Contributions
                    employerPF: components['PF_ER'] || 0,
                    employerESI: components['ESI_ER'] || 0,
                    gratuityAccrual: gratuityAccrual,

                    // State for PT
                    stateCode: employee.state,

                    // Metadata
                    processedAt: new Date(),
                    updatedAt: new Date()
                },
                create: {
                    tenant: { connect: { id: tenantId } },
                    employee: { connect: { id: employeeId } },
                    month,
                    year,
                    totalWorkingDays: daysInMonth,
                    actualPresentDays: effectivePresentDays,
                    lopDays,
                    paidDays,
                    grossSalary: Math.round(totalEarnings),
                    totalDeductions: Math.round(totalDeductions),
                    netSalary: netSalary,
                    payrollRun: payrollRunId ? { connect: { id: payrollRunId } } : undefined,
                    status: 'generated',

                    // Earnings
                    basicPaid: Math.round(components['BASIC'] || 0),
                    hraPaid: Math.round(components['HRA'] || 0),
                    allowancesPaid: Math.max(0, allowancesPaid),
                    otHours: totalOtHours,
                    otPay: Math.round(otAmount),
                    bonus: Math.round(components['BONUS'] || 0),
                    incentives: Math.round(components['INCENTIVES'] || 0),
                    leaveEncashment: Math.round(components['LEAVE_ENCASHMENT'] || 0),
                    reimbursements: Math.round(reimbursementAmount),
                    arrears: Math.round(components['ARREARS'] || 0),

                    // Deductions
                    pfDeduction: components['PF_EMP'] || 0,
                    esiDeduction: components['ESI_EMP'] || 0,
                    ptDeduction: components['PT'] || 0,
                    tdsDeduction: tdsAmount,
                    loanDeduction: totalLoanDeduction,
                    advanceDeduction: Math.round(components['ADVANCE'] || 0),
                    otherDeductions: Math.round(components['OTHER_DED'] || 0),

                    // Employer Contributions
                    employerPF: components['PF_ER'] || 0,
                    employerESI: components['ESI_ER'] || 0,
                    gratuityAccrual: gratuityAccrual,

                    // State for PT
                    stateCode: employee.state,

                    // Metadata
                    processedAt: new Date()
                }
            });

            // 5. Update Loan Balances (Side Effect)
            // Note: This modifies the Loan table. If we re-run payroll, we need to handle this!
            // Ideally, Loan Balance should only update when Payroll is FINALIZED/PAID.
            // But for simple implementation, we assume generated payroll implies deduction.
            // BETTER: Create `LoanDeduction` records linked to this payroll.
            // And use `LoanDeduction` to calculate remaining balance dynamically or update on finalize.

            // Current approach: We delete existing loan deductions for this payroll (if re-run) and create new ones.
            // We do NOT update Loan.balanceAmount here. We update it when 'status' becomes PAID?
            // OR: We just store the deduction record.

            // Removing old deductions for this payroll if exists
            await prisma.loanDeduction.deleteMany({ where: { payrollId: payroll.id } });

            // Create new deductions
            if (loanDeductionsToCreate.length > 0) {
                await prisma.loanDeduction.createMany({
                    data: loanDeductionsToCreate.map(d => ({
                        ...d,
                        tenantId,
                        payrollId: payroll.id
                    }))
                });
            }

            return {
                success: true,
                data: payroll,
                metrics: { totalEarnings, totalDeductions, netSalary }
            };

        } catch (error: any) {
            console.error('Payroll Calculation Error:', error);
            return { success: false, error: error.message };
        }
    }
}
