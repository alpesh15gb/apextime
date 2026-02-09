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

            // Load Tenant Settings
            const settings = await prisma.payrollSetting.findMany({
                where: { tenantId: employee.tenantId }
            });

            const config: Record<string, any> = {};
            settings.forEach(s => {
                try { config[s.key] = JSON.parse(s.value); } catch (e) { config[s.key] = s.value; }
            });

            const statConfig = config['STATUTORY_CONFIG'] || {};
            const paySchedule = config['PAY_SCHEDULE'] || {};

            // Constants from config with fallbacks
            const PF_ER_RATE = (statConfig.pfEmployerRate !== undefined ? statConfig.pfEmployerRate : 13) / 100;
            const PF_EE_RATE = (statConfig.pfEmployeeRate !== undefined ? statConfig.pfEmployeeRate : 12) / 100;
            const PF_LIMIT = statConfig.pfLimit || 15000;
            const BONUS_RATE = (statConfig.bonusRate !== undefined ? statConfig.bonusRate : 8.33) / 100;
            const GRATUITY_RATE = (statConfig.gratuityRate !== undefined ? statConfig.gratuityRate : 4.81) / 100;
            const ESI_ER_RATE = (statConfig.esiEmployerRate !== undefined ? statConfig.esiEmployerRate : 3.25) / 100;
            const ESI_EE_RATE = (statConfig.esiEmployeeRate !== undefined ? statConfig.esiEmployeeRate : 0.75) / 100;
            const ESI_LIMIT = statConfig.esiLimit || 21000;
            const ESI_MAX_CTC = statConfig.esiMaxCtc || 25000; // CTC threshold to check ESI eligibility

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
                    // INDUSTRY-GRADE STATUS HANDLING:
                    // Normalize status and count all work-related statuses towards paid days
                    const status = (dayLog.status || '').toLowerCase().replace(/\s+/g, '_').trim();
                    
                    // Present, Late, Shift Incomplete (single punch) = FULL DAY
                    // Shift Incomplete means employee showed up but only has one punch - still counts as present
                    if (status === 'present' || status === 'late' || status === 'shift_incomplete') {
                        matrixPresent++;
                    }
                    else if (status === 'half_day') {
                        matrixHalfDay++;
                    }
                    else if (status === 'leave_paid' || status === 'paid_leave') {
                        matrixPaidLeave++;
                    }
                    // 'absent' status is NOT counted - employee didn't show up
                }
            }

            // Calendar Day Basis Calculation
            // Standard Days = Calendar Days in Month (e.g. 30 or 31) or Fixed Days from config
            let denominatorDays = daysInMonth;
            if (paySchedule.calculateBasis === 'fixed' && paySchedule.fixedDays) {
                denominatorDays = parseInt(paySchedule.fixedDays) || 30;
            }
            const totalMonthDays = denominatorDays;

            // Effective Paid Days = (Present + Holidays + Paid Leaves) + WeekOffs (Sundays)
            // Note: We currently assume Sundays are always paid (WeekOff) unless we have explicit LOP marking logic for them.
            // If an employee is absent on Sat and Mon, usually Sun is LOP. But for now, we treat Sun as Paid.
            const daysWorkedOrPaid = matrixPresent + (matrixHalfDay * 0.5) + matrixPaidLeave + matrixHolidayCount;

            // Paid Days = Days Worked + Sundays (WeekOffs)
            // Capped at totalMonthDays to handle potential data anomalies
            let paidDays = daysWorkedOrPaid + matrixSundays;

            // If denominator is fixed (e.g. 30), and it's a 31 day month, and they were present all days,
            // we should cap paidDays at denominatorDays.
            paidDays = Math.min(paidDays, denominatorDays);

            // Adjust for joining date mid-month
            if (joiningDay && paySchedule.calculateBasis === 'actual') {
                // If using actual basis, we should align paid days with joining
                paidDays = Math.min(paidDays, daysAfterJoining);
            }

            const lopDays = Math.max(0, denominatorDays - paidDays);

            // Ratio = PaidDays / Denominator
            const attendRatio = denominatorDays > 0 ? (paidDays / denominatorDays) : 0;

            logger.info(`[PAYROLL] ${employee.employeeCode}: Denominator=${denominatorDays}, PaidDays=${paidDays}, Ratio=${attendRatio.toFixed(4)}`);

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

                    // 1. Employer PF (PF_ER_RATE of Basic, capped at PF_LIMIT basis)
                    let erPF = 0;
                    if (employee.isPFEnabled) {
                        erPF = Math.round(Math.min(monthlyValues['BASIC'] || 0, PF_LIMIT) * PF_ER_RATE);
                    }

                    // 2. Bonus & Gratuity (Usually part of CTC in India)
                    // Bonus: BONUS_RATE of Basic
                    // Gratuity: GRATUITY_RATE of Basic
                    const bonus = Math.round((monthlyValues['BASIC'] || 0) * BONUS_RATE);
                    const gratuity = Math.round((monthlyValues['BASIC'] || 0) * GRATUITY_RATE);

                    let balancerValue = Math.max(0, CTC - knownMonthlyEarnings - erPF - bonus - gratuity);

                    // 3. ESI Check (Employer ESI_ER_RATE)
                    if (employee.isESIEnabled && CTC <= ESI_MAX_CTC) {
                        const totalContributionBasis = CTC - erPF - bonus - gratuity;
                        const likelyGross = totalContributionBasis / (1 + ESI_ER_RATE);
                        if (likelyGross <= ESI_LIMIT) {
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
                if (employee.isESIEnabled && totalEarnings <= ESI_LIMIT) {
                    components['ESI_ER'] = Math.round(totalEarnings * ESI_ER_RATE);
                }

            } else {
                // Legacy / Manual Entry Mode
                employee.salaryComponents.forEach(esc => {
                    if (esc.component.type === 'EARNING') {
                        const amount = Math.round((esc.monthlyAmount / denominatorDays) * paidDays);
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

            // Employee PF (PF_EE_RATE of pfBasis, capped)
            if (employee.isPFEnabled) {
                let pfAmount = Math.round(pfBasis * PF_EE_RATE);
                const pfMax = Math.round(PF_LIMIT * PF_EE_RATE);
                if (pfAmount > pfMax) pfAmount = pfMax;
                components['PF_EMP'] = pfAmount;
                totalDeductions += pfAmount;
            }

            // Employee ESI (ESI_EE_RATE of esiBasis)
            if (employee.isESIEnabled && esiBasis <= ESI_LIMIT) {
                const esiAmount = Math.ceil(esiBasis * ESI_EE_RATE);
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
