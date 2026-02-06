import { prisma } from '../config/database';
import { Loan, Employee, Payroll, AttendanceLog, LeaveEntry } from '@prisma/client';
import { PTCalculator } from './ptCalculator';
import { TDSCalculator } from './tdsCalculator';
import logger from '../config/logger';

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
            // Use exclusive upper bound for date ranges to avoid boundary issues
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 1); // Start of NEXT month (exclusive)

            const employee = await prisma.employee.findUnique({
                where: { id: employeeId },
                include: {
                    attendanceLogs: {
                        where: {
                            date: {
                                gte: monthStart,
                                lt: monthEnd
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
            logger.info(`[PAYROLL] Processing: ${employee.firstName} ${employee.lastName} (Code: ${employee.employeeCode}, CTC: ${CTC})`);

            // 1. Calculate Days
            const daysInMonth = new Date(year, month, 0).getDate();

            // Query AttendanceLog — match by employee ID and all known identifiers
            const orConditions: any[] = [
                { employeeId: employee.id }
            ];
            if (employee.employeeCode) orConditions.push({ employee: { employeeCode: employee.employeeCode } });
            if (employee.deviceUserId) orConditions.push({ employee: { deviceUserId: employee.deviceUserId } });
            if (employee.sourceEmployeeId) orConditions.push({ employee: { sourceEmployeeId: employee.sourceEmployeeId } });

            const logs = await prisma.attendanceLog.findMany({
                where: {
                    OR: orConditions,
                    date: { gte: monthStart, lt: monthEnd }
                }
            });

            if (logs.length === 0) {
                logger.warn(`[PAYROLL] No attendance logs found for ${employee.employeeCode} (${employee.firstName}) in ${month}/${year}`);
            }

            // Get Holidays for calculations
            const holidays = await prisma.holiday.findMany({
                where: {
                    OR: [
                        { date: { gte: monthStart, lt: monthEnd } },
                        { isRecurring: true }
                    ],
                    tenantId: employee.tenantId
                }
            });

            // Holiday dates use @db.Date which Prisma returns as UTC midnight.
            // Use UTC getters to extract the correct day number.
            const holidayDays = new Set<number>();
            holidays.forEach(h => {
                const d = new Date(h.date);
                const hDay = d.getUTCDate();
                const hMonth = d.getUTCMonth() + 1;
                const hYear = d.getUTCFullYear();
                if (h.isRecurring || (hMonth === month && hYear === year)) {
                    holidayDays.add(hDay);
                }
            });

            let matrixPresent = 0;
            let matrixHalfDay = 0;
            let matrixPaidLeave = 0;
            let matrixHolidayCount = 0;
            let matrixSundays = 0;
            let daysAfterJoining = 0;

            // Normalize joining date to midnight for clean day comparison
            const rawJoinDate = employee.dateOfJoining ? new Date(employee.dateOfJoining) : null;
            const joiningDay = rawJoinDate
                ? new Date(rawJoinDate.getFullYear(), rawJoinDate.getMonth(), rawJoinDate.getDate())
                : null;

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month - 1, d);

                // Only count days on or after joining
                if (joiningDay && date < joiningDay) continue;
                daysAfterJoining++;

                const isSunday = date.getDay() === 0;
                const isHoliday = holidayDays.has(d);

                if (isSunday) matrixSundays++;
                else if (isHoliday) matrixHolidayCount++;

                // AttendanceLog.date is @db.Date — Prisma returns UTC midnight.
                // Use UTC getters for comparison.
                const dayLog = logs.find(l => {
                    const lDate = new Date(l.date);
                    return lDate.getUTCDate() === d && lDate.getUTCMonth() + 1 === month;
                });

                if (dayLog) {
                    // Normalize status: logSyncService stores 'Present', 'Half Day', 'Absent'
                    const status = (dayLog.status || '').toLowerCase().replace(/\s+/g, '_').trim();
                    if (status === 'present' || status === 'late') matrixPresent++;
                    else if (status === 'half_day') matrixHalfDay++;
                    else if (status === 'leave_paid') matrixPaidLeave++;
                }
            }

            // Standard Working Days = days after joining minus Sundays
            const standardWorkingDays = daysAfterJoining - matrixSundays;

            // Effective Days = actual worked + paid benefits
            const effectivePresentDays = matrixPresent + (matrixHalfDay * 0.5) + matrixPaidLeave + matrixHolidayCount;

            const lopDays = Math.max(0, standardWorkingDays - effectivePresentDays);
            const paidDays = Math.max(0, standardWorkingDays - lopDays);

            const attendRatio = standardWorkingDays > 0 ? (paidDays / standardWorkingDays) : 0;

            logger.info(`[PAYROLL] ${employee.employeeCode}: Days=${daysInMonth}, AfterJoin=${daysAfterJoining}, Sundays=${matrixSundays}, Working=${standardWorkingDays}, Present=${matrixPresent}, Half=${matrixHalfDay}, Holidays=${matrixHolidayCount}, LOP=${lopDays}, Ratio=${attendRatio.toFixed(2)}`);

            // 2. CTC-based salary calculation
            let totalEarnings = 0;
            const components: Record<string, number> = {};

            if (CTC > 0) {
                const monthlyEmpPF = 1800;

                const monthlyBasic = CTC * 0.50;
                const monthlyHRA = CTC * 0.20;
                const monthlyConveyance = 1600;
                const monthlyMedical = 1250;
                const monthlyEdu = 200;

                const monthlyGrossSalary = CTC - monthlyEmpPF;

                const calculatedEarnings = monthlyBasic + monthlyHRA + monthlyConveyance + monthlyMedical + monthlyEdu;
                const monthlyOtherAllow = Math.max(0, CTC - calculatedEarnings);

                // Pro-rata based on attendance
                components['BASIC'] = monthlyBasic * attendRatio;
                components['HRA'] = monthlyHRA * attendRatio;
                components['CONVEYANCE'] = monthlyConveyance * attendRatio;
                components['MEDICAL'] = monthlyMedical * attendRatio;
                components['EDU_ALL'] = monthlyEdu * attendRatio;
                components['OTHER_ALLOW'] = monthlyOtherAllow * attendRatio;
                components['PF_ER'] = monthlyEmpPF * attendRatio;

                totalEarnings = (monthlyBasic + monthlyHRA + monthlyConveyance + monthlyMedical + monthlyEdu + monthlyOtherAllow) * attendRatio;

                const proRatedGross = monthlyGrossSalary * attendRatio;
                components['GROSS_FOR_PAYOUT'] = proRatedGross;
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
                        const shiftDuration = 8;
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

            // PF Employee (Fixed 1800 pro-rated)
            if (employee.isPFEnabled) {
                const pfEmp = Math.round(1800 * attendRatio);
                components['PF_EMP'] = pfEmp;
                totalDeductions += pfEmp;
            }

            // PT — use state-based slab calculator
            if (employee.isPTEnabled) {
                const monthlyGross = components['GROSS_FOR_PAYOUT'] || totalEarnings;
                const pt = PTCalculator.calculatePT(employee.state || null, monthlyGross);
                components['PT'] = pt;
                totalDeductions += pt;
            }

            // TDS — use proper slab-based calculator
            if (CTC > 0) {
                const annualBasic = (CTC * 0.50) * 12;
                const annualHRA = (CTC * 0.20) * 12;
                const annualAllowances = (1600 + 1250 + 200) * 12;
                const annualOther = Math.max(0, CTC - (CTC * 0.50 + CTC * 0.20 + 1600 + 1250 + 200)) * 12;

                const salaryBreakup = {
                    basicAnnual: annualBasic,
                    hraAnnual: annualHRA,
                    allowancesAnnual: annualAllowances,
                    otherEarnings: annualOther
                };

                // Default to new regime with no declarations for auto-calc
                const declaration = {
                    ppf: 0, elss: 0, lifeInsurance: 0, homeLoanPrincipal: 0,
                    tuitionFees: 0, nsc: 0, section80D: 0, section80E: 0,
                    section80G: 0, section24: 0, rentPaid: 0,
                    taxRegime: 'NEW' as const
                };

                const monthlyTDS = TDSCalculator.calculateMonthlyTDS(salaryBreakup, declaration, month);
                const proRatedTDS = Math.round(monthlyTDS * attendRatio);
                components['TDS'] = proRatedTDS;
                totalDeductions += proRatedTDS;
            } else {
                // Fallback: no TDS if no CTC
                components['TDS'] = 0;
            }

            // Staff Welfare (Fixed 200 as per sheet)
            const welfare = 200;
            components['STAFF_WELFARE'] = welfare;
            totalDeductions += welfare;

            // Insurance (Fixed 200 as per sheet)
            const insurance = 200;
            components['INSURANCE'] = insurance;
            totalDeductions += insurance;

            // Uniform (Fixed 0 defaults, can be enabled later)
            const uniform = 0;
            components['UNIFORM'] = uniform;
            totalDeductions += uniform;

            // ESI Employee
            if (employee.isESIEnabled) {
                const esiBasis = (totalEarnings + (components['PF_ER'] || 0));
                const esiEmp = Math.ceil(esiBasis * 0.0075);
                components['ESI_EMP'] = esiEmp;
                totalDeductions += esiEmp;
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
            const retentionRequested = employee.retentionAmount || 0;
            const actualRetention = retentionRequested * attendRatio;
            const finalTakeHome = netSalary - actualRetention;

            // 7. SYNC TO DATABASE
            const payrollData = {
                totalWorkingDays: standardWorkingDays,
                actualPresentDays: effectivePresentDays,
                lopDays, paidDays,
                grossSalary: Math.round(components['GROSS_FOR_PAYOUT'] || totalEarnings),
                totalDeductions: Math.round(totalDeductions),
                netSalary: netSalary,
                retentionDeduction: actualRetention,
                finalTakeHome: finalTakeHome,
                status: 'generated',
                basicPaid: components['BASIC'] || 0,
                hraPaid: components['HRA'] || 0,
                allowancesPaid: (components['CONVEYANCE'] || 0) + (components['MEDICAL'] || 0) + (components['EDU_ALL'] || 0) + (components['OTHER_ALLOW'] || 0),
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
            };

            const payroll = await prisma.payroll.upsert({
                where: {
                    employeeId_month_year_tenantId: {
                        employeeId, month, year, tenantId: employee.tenantId
                    }
                },
                update: payrollData,
                create: {
                    tenantId: employee.tenantId,
                    employeeId, month, year,
                    ...payrollData
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
            logger.error(`Payroll Calculation Error for ${employeeId}:`, error);
            return { success: false, error: error.message };
        }
    }
}
