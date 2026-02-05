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
                                lte: new Date(year, month, 0, 23, 59, 59) // Last day of month
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

            // FUZZY SCAN: Check for anyone else with the same name or partial code
            const similar = await prisma.employee.findMany({
                where: {
                    OR: [
                        { employeeCode: { contains: employee.employeeCode.trim() } },
                        { AND: [{ firstName: employee.firstName }, { lastName: employee.lastName }] }
                    ]
                },
                include: { _count: { select: { attendanceLogs: true } } }
            });

            if (similar.length > 1) {
                console.log(`[PAYROLL_DIAG] !!! POTENTIAL DUPLICATES DETECTED (${similar.length} records found)`);
                similar.forEach(s => {
                    console.log(`   - RECORD: [ID=${s.id}] [CODE=${s.employeeCode}] [NAME=${s.firstName} ${s.lastName}] [LOGS=${s._count.attendanceLogs}]`);
                });
            }

            const CTC = employee.monthlyCtc || 0;
            console.log(`[PAYROLL_ENGINE] Processing Employee: ${employee.firstName} (CTC: ${CTC}, Active: ${employee.isActive})`);

            // 1. Calculate Days (Improved: Handle Working Days strictly)
            const daysInMonth = new Date(year, month, 0).getDate();
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);

            // SYNC WITH MATRIX: Query AttendanceLog table directly
            // We build the OR condition dynamically to avoid matching nulls to the whole DB
            const orConditions: any[] = [
                { employeeId: employee.id }
            ];

            if (employee.employeeCode) orConditions.push({ employee: { employeeCode: employee.employeeCode } });
            if (employee.deviceUserId) orConditions.push({ employee: { deviceUserId: employee.deviceUserId } });
            if (employee.sourceEmployeeId) orConditions.push({ employee: { sourceEmployeeId: employee.sourceEmployeeId } });

            const logs = await prisma.attendanceLog.findMany({
                where: {
                    OR: orConditions,
                    date: { gte: startOfMonth, lte: endOfMonth }
                }
            });

            console.log(`[PAYROLL_MATRIX] Search Identifiers: ID=${employee.id}, Code=${employee.employeeCode}, Device=${employee.deviceUserId}`);
            console.log(`[PAYROLL_MATRIX] Final Log Count for this employee: ${logs.length}`);

            if (logs.length === 0) {
                // If 0 found, let's see who DOES have logs in this month just to see what the data looks like
                const sampleLogs = await prisma.attendanceLog.findMany({
                    where: { date: { gte: startOfMonth, lte: endOfMonth } },
                    take: 5,
                    include: { employee: true }
                });
                console.log(`[PAYROLL_DIAG] Sample logs in DB for Jan (Count: ${sampleLogs.length}):`);
                sampleLogs.forEach(s => console.log(`   - Found Log for: ${s.employee?.firstName} (Code: ${s.employee?.employeeCode}, ID: ${s.employeeId})`));
            }

            // Get Holidays for calculations
            const holidays = await prisma.holiday.findMany({
                where: {
                    OR: [
                        { date: { gte: startOfMonth, lte: endOfMonth } },
                        { isRecurring: true }
                    ],
                    tenantId: employee.tenantId
                }
            });

            const holidayDays = new Set<number>();
            holidays.forEach(h => {
                const d = new Date(h.date);
                if (h.isRecurring || (d.getMonth() + 1 === month && d.getFullYear() === year)) {
                    holidayDays.add(d.getDate());
                }
            });

            let matrixPresent = 0;
            let matrixHalfDay = 0;
            let matrixPaidLeave = 0;
            let matrixHolidayCount = 0;
            let matrixSundays = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month - 1, d);
                const isSunday = date.getDay() === 0;
                const isHoliday = holidayDays.has(d);

                if (isSunday) matrixSundays++;
                else if (isHoliday) matrixHolidayCount++;

                const dayLog = logs.find(l => new Date(l.date).getDate() === d);
                if (dayLog) {
                    const status = (dayLog.status || '').toLowerCase().trim();
                    if (status === 'present' || status === 'late') matrixPresent++;
                    else if (status === 'half_day') matrixHalfDay++;
                    else if (status === 'leave_paid') matrixPaidLeave++;
                }
            }

            const standardWorkingDays = daysInMonth - matrixSundays;
            const effectivePresentDays = matrixPresent + (matrixHalfDay * 0.5) + matrixPaidLeave + matrixHolidayCount;

            console.log(`[PAYROLL_MATRIX] Final -> Present: ${matrixPresent}, Half: ${matrixHalfDay}, Holidays: ${matrixHolidayCount}, Effective: ${effectivePresentDays}`);

            const lopDays = Math.max(0, standardWorkingDays - effectivePresentDays);
            const paidDays = Math.max(0, standardWorkingDays - lopDays);

            // Salary is calculated on working days ratio
            const attendRatio = paidDays / standardWorkingDays;

            console.log(`[PAYROLL_ENGINE] Days in Month: ${daysInMonth}, Sundays: ${matrixSundays}, Working Days: ${standardWorkingDays}`);
            console.log(`[PAYROLL_ENGINE] Paid Days: ${paidDays} / ${standardWorkingDays}`);

            console.log(`[PAYROLL_ENGINE] Attendance Ratio: ${attendRatio}`);

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
                    totalWorkingDays: standardWorkingDays,
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
                    bonus: components['BONUS'] || 0,
                    payrollRunId: payrollRunId,
                    details: JSON.stringify(components),
                    processedAt: new Date()
                },
                create: {
                    tenantId: employee.tenantId,
                    employeeId, month, year,
                    totalWorkingDays: standardWorkingDays,
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
                    bonus: components['BONUS'] || 0,
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
