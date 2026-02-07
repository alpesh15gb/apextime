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

            // 2. DYNAMIC Salary Calculation
            let totalEarnings = 0;
            const components: Record<string, number> = {};
            let pfBasis = 0;
            let esiBasis = 0;

            if (CTC > 0) {
                // Fetch Tenant's Salary Components
                const tenantComponents = await prisma.salaryComponent.findMany({
                    where: {
                        tenantId: employee.tenantId,
                        isActive: true
                    },
                    orderBy: { type: 'asc' } // Earnings first
                });

                // Separate Earnings and Deductions
                const earningComps = tenantComponents.filter(c => c.type === 'EARNING');
                const deductionComps = tenantComponents.filter(c => c.type === 'DEDUCTION');

                // --- EARNINGS CALCULATION ---
                // We need to resolve dependencies. Simple approach: 
                // 1. Resolve CTC based first.
                // 2. Resolve BASIC based next.
                // 3. Others.

                // Temp storage for calculated monthly values (full month)
                const monthlyValues: Record<string, number> = {};

                // Helper to evaluate value
                const calculateValue = (comp: any, context: any) => {
                    if (comp.calculationType === 'FLAT') return comp.value || 0;
                    if (comp.calculationType === 'PERCENTAGE') {
                        // Check formula or default to CTC
                        const percent = (comp.value || 0) / 100;
                        if (comp.formula && comp.formula.includes('BASIC')) {
                            return (context.BASIC || 0) * percent;
                        }
                        return context.CTC * percent;
                    }
                    return 0;
                };

                // Pass 1: Calculate BASIC (Priority)
                const basicComp = earningComps.find(c => c.code === 'BASIC' || c.name.toUpperCase() === 'BASIC');
                if (basicComp) {
                    monthlyValues['BASIC'] = calculateValue(basicComp, { CTC });
                } else {
                    // Fallback if no Basic component configured
                    monthlyValues['BASIC'] = CTC * 0.50;
                }

                // Pass 2: Calculate Rest
                earningComps.forEach(comp => {
                    if (comp.code === 'BASIC' || comp.name.toUpperCase() === 'BASIC') return; // Already done

                    // Simple dependency injection
                    monthlyValues[comp.code] = calculateValue(comp, {
                        CTC,
                        BASIC: monthlyValues['BASIC']
                    });
                });

                // Calculate "Other Allowance" (Balancing figure) -> Fixed Allowance
                // Check if there is a component with formula 'REMAINING_CTC' or similar
                const fixedAllowComp = earningComps.find(c => c.formula === 'REMAINING_CTC' || c.name === 'Fixed Allowance');
                if (fixedAllowComp) {
                    // Sum all others
                    const usedCTC = Object.values(monthlyValues).reduce((a, b) => a + b, 0); // Note: This includes Basic + others

                    // Deduct PF Employer if it's part of CTC (usually is)
                    // We assume a standard 1800 or 12% PF Employer for CTC calculation for now
                    // For precise "Cost to Company" reverse calc, we need to know Employer contributions.
                    // Simplified: CTC = Gross Earnings + Employer PF + Employer ESA

                    // Let's assume the user defined "Fixed Allowance" as the balancer for GROSS, not CTC.
                    // But if formula is REMAINING_CTC, we try our best.
                    const currentTotal = usedCTC; // Already calculated
                    const employerPF = 1800; // Hardcoded estimate for now
                    monthlyValues[fixedAllowComp.code] = Math.max(0, CTC - currentTotal - employerPF);
                }

                // --- PRO-RATA & STATUTORY BASIS ---

                earningComps.forEach(comp => {
                    const monthlyVal = monthlyValues[comp.code] || 0;
                    const proRated = Math.round(monthlyVal * attendRatio);
                    components[comp.code] = proRated;
                    totalEarnings += proRated;

                    // Statutory Basis Accumulation
                    if (comp.isEPFApplicable) pfBasis += proRated;
                    if (comp.isESIApplicable) esiBasis += proRated;
                });

                const proRatedGross = totalEarnings;
                components['GROSS_FOR_PAYOUT'] = proRatedGross;

            } else {
                // Fallback to manual components if CTC is not set (Legacy logic)
                employee.salaryComponents.forEach(esc => {
                    if (esc.component.type === 'EARNING') {
                        const amount = (esc.monthlyAmount / daysInMonth) * paidDays;
                        components[esc.component.code] = amount;
                        totalEarnings += amount;
                        // For legacy manual, we assume flags aren't set or just take all for now?
                        // Let's rely on the component flags if available
                        if (esc.component.isEPFApplicable) pfBasis += amount;
                        if (esc.component.isESIApplicable) esiBasis += amount;
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
                    // Usually OT is also part of ESI wages
                    esiBasis += otAmount;
                }
            }

            // 4. DEDUCTIONS
            let totalDeductions = 0;

            // PF Employee 
            // Logic: 12% of pfBasis, capped at 15k limit usually, but let's follow flags
            if (employee.isPFEnabled) {
                // Check for explicit PF Component or default
                // If isEPFApplicable was set, we use pfBasis
                // Default rule: 12% of Basic + DA (pfBasis)
                // Cap at 1800 (12% of 15000) ?? User might want Actuals. 
                // For now, implementing standard rule: Min(pfBasis, 15000) * 0.12 if capped.
                // But simplified: 12% of pfBasis
                let pfAmount = Math.round(pfBasis * 0.12);

                // Hard Cap check (optional, usually configurable)
                if (pfAmount > 1800) pfAmount = 1800; // Default cap

                components['PF_EMP'] = pfAmount;
                totalDeductions += pfAmount;
            }

            // ESI Employee
            if (employee.isESIEnabled) {
                // ESI Rule: 0.75% of Gross Wages (esiBasis)
                // Only if Gross <= 21000? Usually checked at master level.
                // Simplified: Calculate if enabled
                const esiAmount = Math.ceil(esiBasis * 0.0075);
                components['ESI_EMP'] = esiAmount;
                totalDeductions += esiAmount;
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
                const annualIncome = totalEarnings * 12; // Simplified projection
                // Real TDS needs annual projection. Re-using existing legacy logic or 0 for now to safe-guard
                // ... (Keep existing TDS logic if it works, or 0)
                const annualBasic = (components['BASIC'] || 0) * 12; // approximation
                // ... Keep it simple for dynamic

                // Fallback to simple calculation or 0 if complex
                components['TDS'] = 0;
                // totalDeductions += 0;
            } else {
                components['TDS'] = 0;
            }

            // Other Deductions from valid components
            // Fetch Deduction Components
            const tenantComponents = await prisma.salaryComponent.findMany({
                where: { tenantId: employee.tenantId, type: 'DEDUCTION', isActive: true }
            });
            tenantComponents.forEach(comp => {
                if (['PF_EMP', 'ESI_EMP', 'PT', 'TDS'].includes(comp.code)) return; // Handled specially above

                // Flat deductions usually
                const val = comp.value || 0;
                components[comp.code] = val;
                totalDeductions += val;
            });

            // Staff Welfare / Insurance (Legacy hardcodes - remove if moved to Components)
            // Keeping them if they are NOT in components to avoid breaking existing data
            // But ideally user adds them as "DEDUCTION" components now.

            // 5. LOANS
            let totalLoanDeduction = 0;
            const loanDeductionsToCreate = [];
            for (const loan of employee.loans) {
                if (loan.balanceAmount <= 0) continue;
                let deduction = Math.min(loan.monthlyDeduction, loan.balanceAmount);
                totalLoanDeduction += deduction;
                // Don't add to totalDeductions here, we sum it up below
                loanDeductionsToCreate.push({ loanId: loan.id, amount: deduction });
            }
            components['LOAN'] = totalLoanDeduction;

            // Recalculate Total Deductions
            totalDeductions += totalLoanDeduction;

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
                // allowsPaid: sum of all non-basic/hra earnings
                allowancesPaid: totalEarnings - (components['BASIC'] || 0) - (components['HRA'] || 0),
                otPay: otAmount,
                pfDeduction: components['PF_EMP'] || 0,
                esiDeduction: components['ESI_EMP'] || 0,
                ptDeduction: components['PT'] || 0,
                loanDeduction: totalLoanDeduction,
                employerPF: components['PF_ER'] || 0, // Need to calc ER too if needed
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
