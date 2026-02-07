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

                const earningComps = tenantComponents.filter(c => c.type === 'EARNING');
                const monthlyValues: Record<string, number> = {};

                // Pass 1: Handle Priority/Base Components (BASIC)
                const basicComp = earningComps.find(c => c.code === 'BASIC' || c.name.toUpperCase() === 'BASIC');
                if (basicComp) {
                    if (basicComp.calculationType === 'PERCENTAGE') {
                        monthlyValues['BASIC'] = CTC * ((basicComp.value || 40) / 100);
                    } else {
                        monthlyValues['BASIC'] = basicComp.value || (CTC * 0.4);
                    }
                } else {
                    monthlyValues['BASIC'] = CTC * 0.4; // Default if missing
                }

                // Pass 2: Calculate other components (Fixed ones first)
                earningComps.forEach(comp => {
                    if (comp.code === 'BASIC' || comp.name.toUpperCase() === 'BASIC') return;
                    if (comp.formula === 'REMAINING_CTC' || comp.name === 'Fixed Allowance' || comp.code === 'FIXED_ALLOWANCE') return;

                    if (comp.calculationType === 'FLAT') {
                        monthlyValues[comp.code] = comp.value || 0;
                    } else if (comp.calculationType === 'PERCENTAGE') {
                        const baseValue = (comp.formula && comp.formula.includes('BASIC'))
                            ? monthlyValues['BASIC']
                            : CTC;
                        monthlyValues[comp.code] = baseValue * ((comp.value || 0) / 100);
                    }
                });

                // Pass 3: Calculate Balancer (Fixed Allowance / REMAINING_CTC)
                // CTC = Gross_Earnings + Employer_PF + Employer_ESI + Bonus + Gratuity
                const fixedAllowComp = earningComps.find(c => c.formula === 'REMAINING_CTC' || c.name === 'Fixed Allowance' || c.code === 'FIXED_ALLOWANCE');
                if (fixedAllowComp) {
                    const knownMonthlyEarnings = Object.entries(monthlyValues)
                        .reduce((sum, [code, val]) => sum + val, 0);

                    // 1. Employer PF (13% of Basic, capped at 15k basis)
                    let erPF = 0;
                    if (employee.isPFEnabled) {
                        erPF = Math.round(Math.min(monthlyValues['BASIC'] || 0, 15000) * 0.13);
                    }

                    // 2. Bonus & Gratuity (Usually part of CTC in India)
                    // Bonus: 8.33% of Basic or 7000 (usually 8.33% of Basic for CTC purpose)
                    // Gratuity: 4.81% of Basic
                    const bonus = Math.round((monthlyValues['BASIC'] || 0) * 0.0833);
                    const gratuity = Math.round((monthlyValues['BASIC'] || 0) * 0.0481);

                    let balancerValue = Math.max(0, CTC - knownMonthlyEarnings - erPF - bonus - gratuity);

                    // 3. ESI Check (Employer 3.25%)
                    if (employee.isESIEnabled && CTC <= 25000) {
                        const totalContributionBasis = CTC - erPF - bonus - gratuity;
                        const likelyGross = totalContributionBasis / 1.0325;
                        if (likelyGross <= 21000) {
                            balancerValue = Math.max(0, likelyGross - knownMonthlyEarnings);
                        }
                    }

                    monthlyValues[fixedAllowComp.code] = Math.round(balancerValue);

                    // Store ER contributions in details for payslip
                    components['PF_ER'] = erPF;
                    components['BONUS_ACCRUAL'] = bonus;
                    components['GRATUITY_ACCRUAL'] = gratuity;
                }

                // --- PRO-RATA APPLY ---
                earningComps.forEach(comp => {
                    const monthlyVal = monthlyValues[comp.code] || 0;
                    const proRated = Math.round(monthlyVal * attendRatio);
                    components[comp.code] = proRated;
                    totalEarnings += proRated;

                    // Statutory Basis Accumulation
                    if (comp.isEPFApplicable) pfBasis += proRated;
                    if (comp.isESIApplicable) esiBasis += proRated;
                });

                // Re-calculate Employer ESI on pro-rated Gross
                if (employee.isESIEnabled && totalEarnings <= 21000) {
                    components['ESI_ER'] = Math.round(totalEarnings * 0.0325);
                }

            } else {
                // Legacy / Manual Entry Mode
                employee.salaryComponents.forEach(esc => {
                    if (esc.component.type === 'EARNING') {
                        const amount = Math.round((esc.monthlyAmount / daysInMonth) * paidDays);
                        components[esc.component.code] = amount;
                        totalEarnings += amount;
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
                    otAmount = Math.round(totalOtHours * hourlyRate * (employee.otRateMultiplier || 1.25));
                    totalEarnings += otAmount;
                    components['OVERTIME'] = otAmount;
                    esiBasis += otAmount; // OT is part of ESI wages
                }
            }

            // 4. DEDUCTIONS (Statutory & Custom)
            let totalDeductions = 0;

            // Employee PF (12% of pfBasis, capped at 1800)
            if (employee.isPFEnabled) {
                let pfAmount = Math.round(pfBasis * 0.12);
                if (pfAmount > 1800) pfAmount = 1800;
                components['PF_EMP'] = pfAmount;
                totalDeductions += pfAmount;
            }

            // Employee ESI (0.75% of esiBasis)
            if (employee.isESIEnabled && esiBasis <= 21000) {
                const esiAmount = Math.ceil(esiBasis * 0.0075);
                components['ESI_EMP'] = esiAmount;
                totalDeductions += esiAmount;
            }

            // Professional Tax (Slab based)
            if (employee.isPTEnabled) {
                const pt = PTCalculator.calculatePT(employee.state || null, totalEarnings);
                components['PT'] = pt;
                totalDeductions += pt;
            }

            // Other Deductions from components
            const tenantDeductionComps = await prisma.salaryComponent.findMany({
                where: { tenantId: employee.tenantId, type: 'DEDUCTION', isActive: true }
            });
            tenantDeductionComps.forEach(comp => {
                const codesToSkip = ['PF_EMP', 'ESI_EMP', 'PT', 'TDS'];
                if (codesToSkip.includes(comp.code)) return;

                const val = comp.value || 0;
                components[comp.code] = val; // Usually deductions are flat monthly
                totalDeductions += val;
            });

            // 5. LOANS
            let totalLoanDeduction = 0;
            const loanDeductionsToCreate = [];
            for (const loan of employee.loans) {
                if (loan.balanceAmount <= 0) continue;
                let deduction = Math.min(loan.monthlyDeduction, loan.balanceAmount);
                totalLoanDeduction += deduction;
                loanDeductionsToCreate.push({ loanId: loan.id, amount: deduction });
            }
            components['LOAN'] = totalLoanDeduction;
            totalDeductions += totalLoanDeduction;

            // 6. NET SALARY & RETENTION
            const netSalary = Math.round(totalEarnings - totalDeductions);
            const actualRetention = Math.round((employee.retentionAmount || 0) * attendRatio);
            const finalTakeHome = netSalary - actualRetention;

            // 7. SYNC TO DATABASE
            const payrollData = {
                totalWorkingDays: totalMonthDays,
                actualPresentDays: daysWorkedOrPaid,
                lopDays: daysInMonth - paidDays,
                paidDays,
                grossSalary: Math.round(totalEarnings),
                totalDeductions: Math.round(totalDeductions),
                netSalary: netSalary,
                retentionDeduction: actualRetention,
                finalTakeHome: Math.round(finalTakeHome),
                status: 'generated',
                basicPaid: components['BASIC'] || 0,
                hraPaid: components['HRA'] || components['CONVEYANCE'] || 0, // Fallback for breakdown
                allowancesPaid: totalEarnings - (components['BASIC'] || 0),
                otPay: otAmount,
                pfDeduction: components['PF_EMP'] || 0,
                esiDeduction: components['ESI_EMP'] || 0,
                ptDeduction: components['PT'] || 0,
                loanDeduction: totalLoanDeduction,
                employerPF: components['PF_ER'] || 0,
                employerESI: components['ESI_ER'] || 0,
                bonus: components['BONUS_ACCRUAL'] || 0,
                gratuityAccrual: components['GRATUITY_ACCRUAL'] || 0,
                details: JSON.stringify(components),
                processedAt: new Date(),
                payrollRunId
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
