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

            // Calendar Day Basis Calculation
            // Standard Days = Calendar Days in Month (e.g. 30 or 31)
            const totalMonthDays = daysInMonth;

            // Effective Paid Days = (Present + Holidays + Paid Leaves) + WeekOffs (Sundays)
            // Note: We currently assume Sundays are always paid (WeekOff) unless we have explicit LOP marking logic for them.
            // If an employee is absent on Sat and Mon, usually Sun is LOP. But for now, we treat Sun as Paid.
            const daysWorkedOrPaid = matrixPresent + (matrixHalfDay * 0.5) + matrixPaidLeave + matrixHolidayCount;

            // Paid Days = Days Worked + Sundays (WeekOffs)
            // Capped at totalMonthDays to handle potential data anomalies
            let paidDays = daysWorkedOrPaid + matrixSundays;

            // Adjust for joining date mid-month
            if (joiningDay) {
                // If joined mid-month, they can't be paid for days before joining
                // So PaidDays should only account for days >= joiningDay
                // Our loop only counted matrix stats for d >= joiningDay
                // So 'paidDays' is already correct relative to "Days since joining"
                // But the Denominator for pro-ration should ideally be DaysInMonth? 
                // SHEET LOGIC: sheet shows "Days in Jan: 31", "Paid Days: 24". 
                // Earning = Fixed * (24/31).
                // So denominator is ALWAYS daysInMonth.
            }

            // Correction: If PaidDays > DaysAfterJoining (impossible by logic, but safe guard)
            paidDays = Math.min(paidDays, daysAfterJoining);

            const lopDays = daysAfterJoining - paidDays;

            // Ratio = PaidDays / DaysInMonth
            // Example: 24 / 31 = 0.774
            const attendRatio = totalMonthDays > 0 ? (paidDays / totalMonthDays) : 0;

            logger.info(`[PAYROLL] ${employee.employeeCode}: DaysInMonth=${totalMonthDays}, PaidDays=${paidDays}, Sundays=${matrixSundays}, Worked/Holiday=${daysWorkedOrPaid}, Ratio=${attendRatio.toFixed(4)}`);

            // 2. CTC-based salary calculation
            let totalEarnings = 0;
            const components: Record<string, number> = {};

            if (CTC > 0) {
                const monthlyEmpPF = 1800; // Fixed per month

                // Configurable Percentages
                const BASIC_PERCENTAGE = 0.50; // 50% of CTC
                const HRA_PERCENTAGE = 0.20;   // 20% of CTC

                const monthlyBasic = CTC * BASIC_PERCENTAGE;
                const monthlyHRA = CTC * HRA_PERCENTAGE;
                const monthlyConveyance = 1600;
                const monthlyMedical = 1250;
                const monthlyEdu = 200;

                const monthlyGrossSalary = CTC - monthlyEmpPF;

                const calculatedEarnings = monthlyBasic + monthlyHRA + monthlyConveyance + monthlyMedical + monthlyEdu;
                const monthlyOtherAllow = Math.max(0, CTC - calculatedEarnings);

                // Pro-rata based on attendance
                // Pro-rata based on attendance - ROUNDED
                components['BASIC'] = Math.round(monthlyBasic * attendRatio);
                components['HRA'] = Math.round(monthlyHRA * attendRatio);
                components['CONVEYANCE'] = Math.round(monthlyConveyance * attendRatio);
                components['MEDICAL'] = Math.round(monthlyMedical * attendRatio);
                components['EDU_ALL'] = Math.round(monthlyEdu * attendRatio);
                components['OTHER_ALLOW'] = Math.round(monthlyOtherAllow * attendRatio);
                components['PF_ER'] = Math.round(monthlyEmpPF * attendRatio);

                totalEarnings = (components['BASIC'] + components['HRA'] + components['CONVEYANCE'] + components['MEDICAL'] + components['EDU_ALL'] + components['OTHER_ALLOW']);

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
            // Removed redundant addition as totalDeductions will be summed from rounded components
            // totalDeductions += welfare;

            // Insurance (Fixed 200 as per sheet)
            const insurance = 200;
            components['INSURANCE'] = insurance;
            // totalDeductions += insurance;

            // Uniform (Fixed 0 defaults, can be enabled later)
            const uniform = 0;
            components['UNIFORM'] = uniform;
            // totalDeductions += uniform;

            // ESI Employee
            let esiEmp = 0;
            if (employee.isESIEnabled) {
                const esiBasis = (totalEarnings + (components['PF_ER'] || 0));
                esiEmp = Math.ceil(esiBasis * 0.0075);
                components['ESI_EMP'] = esiEmp;
            }

            // LOANS
            let totalLoanDeduction = 0;
            // ... (loops logic unchanged, just aggregating)
            for (const loan of employee.loans) {
                // ...
            }

            // Recalculate Total Deductions from rounded components for accuracy
            totalDeductions =
                (components['PF_EMP'] || 0) +
                (components['PT'] || 0) +
                (components['TDS'] || 0) +
                welfare + insurance + uniform +
                (components['ESI_EMP'] || 0) +
                totalLoanDeduction;

            // 6. NET SALARY & RETENTION
            const netSalary = Math.round(totalEarnings - totalDeductions);

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
                totalWorkingDays: totalMonthDays,
                actualPresentDays: daysWorkedOrPaid,
                lopDays: daysInMonth - paidDays, paidDays,
                grossSalary: Math.round(components['GROSS_FOR_PAYOUT'] || totalEarnings),
                totalDeductions: Math.round(totalDeductions),
                netSalary: netSalary,
                retentionDeduction: Math.round(actualRetention),
                finalTakeHome: Math.round(finalTakeHome),
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
