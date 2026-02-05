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
                    salaryComponents: {
                        where: { isActive: true },
                        include: { component: true }
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

            const CTC = employee.monthlyCtc || 0;
            console.log(`[PAYROLL_ENGINE] Processing Employee: ${employee.firstName} (CTC: ${CTC}, Active: ${employee.isActive})`);

            // 1. Calculate Days
            const daysInMonth = new Date(year, month, 0).getDate();
            const presentDays = employee.attendanceLogs.filter(l => l.status === 'present').length;
            const weeklyOffs = employee.attendanceLogs.filter(l => l.status === 'weekly_off').length;
            const holidays = employee.attendanceLogs.filter(l => l.status === 'holiday').length;
            const leaves = employee.attendanceLogs.filter(l => l.status === 'leave_paid').length;
            const halfDayCount = employee.attendanceLogs.filter(l => l.status === 'half_day').length;

            let effectivePresentDays = presentDays + weeklyOffs + holidays + leaves + (halfDayCount * 0.5);

            // Fallback: Default to full month if logs are missing or sparse for an active employee
            const isCurrentMonth = new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

            if (employee.isActive && effectivePresentDays === 0) {
                if (employee.attendanceLogs.length < 5 || isCurrentMonth) {
                    console.log(`[PAYROLL_ENGINE] Incomplete logs detected for ${employee.firstName}. Using full month fallback.`);
                    effectivePresentDays = daysInMonth;
                }
            }

            const lopDays = Math.max(0, daysInMonth - effectivePresentDays);
            const paidDays = Math.max(0, daysInMonth - lopDays);
            const attendRatio = paidDays / daysInMonth;

            console.log(`[PAYROLL_ENGINE] Attendance: ${paidDays}/${daysInMonth} days (Ratio: ${attendRatio})`);

            // 2. REVERSE CTC LOGIC (Keystone Structure)
            let totalEarnings = 0;
            const components: Record<string, number> = {};

            if (CTC > 0) {
                // A. Base Components (Standard Ratios)
                const monthlyBasic = CTC * 0.40;
                const monthlyHRA = monthlyBasic * 0.40; // Derived from sheet 3360/8400
                const monthlyBonus = monthlyBasic * 0.0833;
                const monthlyGratuity = monthlyBasic * 0.0481;
                const monthlyEmpPF = monthlyBasic * 0.12;

                // Fixed Allowances (Standard)
                const monthlyLTA = 1050;
                const monthlyUniform = 3000;
                const monthlyEdu = 200;

                // B. Calculate Gross for ESIC (The Tg variable)
                // Formula: Tg = (CTC - Bonus - Gratuity) / 1.0325
                const totalGrossForESIC = (CTC - monthlyBonus - monthlyGratuity) / 1.0325;
                const monthlyEmpESI = totalGrossForESIC * 0.0325;

                // C. Calculate Gross Salary (Payout Gross)
                const monthlyGrossSalary = totalGrossForESIC - monthlyEmpPF;

                // D. Balancing Figure: Other Allowance
                const calculatedFixed = monthlyBasic + monthlyHRA + monthlyLTA + monthlyUniform + monthlyEdu;
                const monthlyOtherAllow = Math.max(0, monthlyGrossSalary - calculatedFixed);

                // --- PRO-RATA APPLICATION (Attendance Based) ---
                components['BASIC'] = monthlyBasic * attendRatio;
                components['HRA'] = monthlyHRA * attendRatio;
                components['LTA'] = monthlyLTA * attendRatio;
                components['UNIFORM'] = monthlyUniform * attendRatio;
                components['EDU_ALL'] = monthlyEdu * attendRatio;
                components['OTHER_ALLOW'] = monthlyOtherAllow * attendRatio;

                // Employer Share (Pro-rated for reporting)
                components['PF_ER'] = monthlyEmpPF * attendRatio;
                components['ESI_ER'] = monthlyEmpESI * attendRatio;
                components['BONUS'] = monthlyBonus * attendRatio;
                components['GRATUITY'] = monthlyGratuity * attendRatio;

                totalEarnings = components['BASIC'] + components['HRA'] + components['LTA'] +
                    components['UNIFORM'] + components['EDU_ALL'] + components['OTHER_ALLOW'];
            } else {
                // Fallback to manual components if CTC is not set
                employee.salaryComponents.forEach(esc => {
                    if (esc.component.type === 'EARNING') {
                        const amount = (esc.monthlyAmount / daysInMonth) * paidDays;
                        components[esc.component.code] = amount;
                        totalEarnings += amount;
                    }
                });
            }

            // 3. Optional OT
            let otAmount = 0;
            if (employee.isOTEnabled) {
                let totalOtHours = 0;
                employee.attendanceLogs.forEach(log => {
                    if (log.workingHours && log.shiftStart && log.shiftEnd) {
                        const shiftDuration = 8; // Standard 8hr shift
                        totalOtHours += Math.max(0, log.workingHours - shiftDuration);
                    }
                });
                if (totalOtHours > 0) {
                    const hourlyRate = (totalEarnings / (paidDays * 8)) || 0;
                    otAmount = totalOtHours * hourlyRate * (employee.otRateMultiplier || 1.25);
                    totalEarnings += otAmount;
                    components['OVERTIME'] = otAmount;
                }
            }

            // 4. DEDUCTIONS
            let totalDeductions = 0;

            // PF Employee (12% of Basic)
            if (employee.isPFEnabled) {
                const pfEmp = Math.round((components['BASIC'] || 0) * 0.12);
                components['PF_EMP'] = pfEmp;
                totalDeductions += pfEmp;
            }

            // ESI Employee (0.75% of Total Gross)
            if (employee.isESIEnabled) {
                const esiBasis = (totalEarnings + (components['PF_ER'] || 0));
                const esiEmp = Math.ceil(esiBasis * 0.0075);
                components['ESI_EMP'] = esiEmp;
                totalDeductions += esiEmp;
            }

            // PT (Fixed 150 as per sheet or use calculator)
            if (employee.isPTEnabled) {
                const pt = PTCalculator.calculatePT(employee.state, totalEarnings) || 150;
                components['PT'] = pt;
                totalDeductions += pt;
            }

            // 5. LOANS
            let totalLoanDeduction = 0;
            const loanDeductionsToCreate = [];
            for (const loan of employee.loans) {
                if (loan.balanceAmount <= 0) continue;
                let deduction = Math.min(loan.monthlyDeduction, loan.balanceAmount);
                totalLoanDeduction += deduction;
                totalDeductions += deduction;
                loanDeductionsToCreate.push({ loanId: loan.id, amount: deduction });
            }
            components['LOAN'] = totalLoanDeduction;

            // 6. NET SALARY & RETENTION
            const netSalary = Math.round(totalEarnings - totalDeductions);

            // Retention Logic
            const retentionRequested = employee.retentionAmount || 0;
            // Pro-rate retention if they were absent? Usually yes.
            const actualRetention = retentionRequested * attendRatio;
            const finalTakeHome = netSalary - actualRetention;

            // 7. SYNC TO DATABASE
            const payroll = await prisma.payroll.upsert({
                where: {
                    employeeId_month_year_tenantId: {
                        employeeId, month, year, tenantId: employee.tenantId
                    }
                },
                update: {
                    totalWorkingDays: daysInMonth,
                    actualPresentDays: effectivePresentDays,
                    lopDays, paidDays,
                    grossSalary: Math.round(totalEarnings),
                    totalDeductions: Math.round(totalDeductions),
                    netSalary: netSalary,
                    retentionDeduction: actualRetention,
                    finalTakeHome: finalTakeHome,
                    status: 'generated',
                    basicPaid: components['BASIC'] || 0,
                    hraPaid: components['HRA'] || 0,
                    allowancesPaid: (components['LTA'] || 0) + (components['UNIFORM'] || 0) + (components['EDU_ALL'] || 0) + (components['OTHER_ALLOW'] || 0),
                    otPay: otAmount,
                    pfDeduction: components['PF_EMP'] || 0,
                    esiDeduction: components['ESI_EMP'] || 0,
                    ptDeduction: components['PT'] || 0,
                    loanDeduction: totalLoanDeduction,
                    employerPF: components['PF_ER'] || 0,
                    employerESI: components['ESI_ER'] || 0,
                    gratuityAccrual: components['GRATUITY'] || 0,
                    payrollRunId: payrollRunId,
                    details: JSON.stringify(components),
                    processedAt: new Date()
                },
                create: {
                    tenantId: employee.tenantId,
                    employeeId, month, year,
                    totalWorkingDays: daysInMonth,
                    actualPresentDays: effectivePresentDays,
                    lopDays, paidDays,
                    grossSalary: Math.round(totalEarnings),
                    totalDeductions: Math.round(totalDeductions),
                    netSalary: netSalary,
                    retentionDeduction: actualRetention,
                    finalTakeHome: finalTakeHome,
                    status: 'generated',
                    basicPaid: components['BASIC'] || 0,
                    hraPaid: components['HRA'] || 0,
                    allowancesPaid: (components['LTA'] || 0) + (components['UNIFORM'] || 0) + (components['EDU_ALL'] || 0) + (components['OTHER_ALLOW'] || 0),
                    otPay: otAmount,
                    pfDeduction: components['PF_EMP'] || 0,
                    esiDeduction: components['ESI_EMP'] || 0,
                    ptDeduction: components['PT'] || 0,
                    loanDeduction: totalLoanDeduction,
                    employerPF: components['PF_ER'] || 0,
                    employerESI: components['ESI_ER'] || 0,
                    gratuityAccrual: components['GRATUITY'] || 0,
                    payrollRunId: payrollRunId,
                    details: JSON.stringify(components),
                    processedAt: new Date()
                }
            });

            // Clean up and create loan records
            await prisma.loanDeduction.deleteMany({ where: { payrollId: payroll.id } });
            if (loanDeductionsToCreate.length > 0) {
                await prisma.loanDeduction.createMany({
                    data: loanDeductionsToCreate.map(d => ({ ...d, tenantId: employee.tenantId, payrollId: payroll.id }))
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
