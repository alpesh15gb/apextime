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

            if (logs.length === 0) {
                console.log(`[PAYROLL_SEARCH] !!! NO LOGS FOUND FOR YLR480. SCANNING ENTIRE DATABASE FOR JAN...`);
                const globalLogs = await prisma.attendanceLog.findMany({
                    where: {
                        date: { gte: startOfMonth, lte: endOfMonth },
                        status: { in: ['Present', 'present', 'Late', 'late', 'Half Day', 'half_day'] }
                    },
                    include: { employee: true },
                    take: 200 // Limit to avoid spam, but enough to find the employee
                });

                const logStats: Record<string, number> = {};
                globalLogs.forEach(gl => {
                    const key = `${gl.employee?.employeeCode} (${gl.employee?.firstName})`;
                    logStats[key] = (logStats[key] || 0) + 1;
                });

                console.log(`[PAYROLL_SEARCH] Employees found with logs in Jan:`);
                Object.entries(logStats).forEach(([emp, count]) => {
                    if (count > 0) console.log(`   - ${emp}: ${count} days`);
                });
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
            let daysAfterJoining = 0;

            const joiningDate = employee.dateOfJoining ? new Date(employee.dateOfJoining) : null;

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month - 1, d);

                // Only count days AFTER joining
                if (joiningDate && date < joiningDate) continue;
                daysAfterJoining++;

                const isSunday = date.getDay() === 0;
                const isHoliday = holidayDays.has(d);

                if (isSunday) matrixSundays++;
                else if (isHoliday) matrixHolidayCount++;

                const dayLog = logs.find(l => {
                    const lDate = new Date(l.date);
                    return lDate.getDate() === d && lDate.getMonth() + 1 === month;
                });

                if (dayLog) {
                    const status = (dayLog.status || '').toLowerCase().trim();
                    if (status === 'present' || status === 'late') matrixPresent++;
                    else if (status === 'half_day') matrixHalfDay++;
                    else if (status === 'leave_paid') matrixPaidLeave++;
                }
            }

            // ROBUST CALCULATION:
            // Standard Working Days for this employee = All days in month - (Days before joining) - (Sundays after joining)
            const standardWorkingDays = daysAfterJoining - matrixSundays;

            // Effective Days = Days they actually worked + Paid benefits
            const effectivePresentDays = matrixPresent + (matrixHalfDay * 0.5) + matrixPaidLeave + matrixHolidayCount;

            const lopDays = Math.max(0, standardWorkingDays - effectivePresentDays);
            const paidDays = Math.max(0, standardWorkingDays - lopDays);

            // Salary is calculated on working days ratio
            const attendRatio = standardWorkingDays > 0 ? (paidDays / standardWorkingDays) : 0;

            console.log(`[PAYROLL_ROBUST] Emp: ${employee.firstName}, TotalMonth: ${daysInMonth}, AfterJoin: ${daysAfterJoining}, Sundays: ${matrixSundays}, WorkingTotal: ${standardWorkingDays}`);
            console.log(`[PAYROLL_ROBUST] Present: ${matrixPresent}, Half: ${matrixHalfDay}, Holidays: ${matrixHolidayCount}, Effective: ${effectivePresentDays}, Ratio: ${attendRatio}`);

            // 2. REVERSE CTC LOGIC (Match Excel Image Structure)
            let totalEarnings = 0;
            const components: Record<string, number> = {};

            if (CTC > 0) {
                // Fixed PF as per image
                const monthlyEmpPF = 1800; // Fixed 1800 for both ER and EE

                // A. Base Components (Standard Ratios from Image)
                const monthlyBasic = CTC * 0.50;  // 50% Basic
                const monthlyHRA = CTC * 0.20;    // 20% HRA

                // B. Fixed Allowances (Standard from Image)
                const monthlyConveyance = 1600;
                const monthlyMedical = 1250;
                const monthlyEdu = 200;

                // C. Gross Salary (Payout Gross) = CTC - Employer PF
                const monthlyGrossSalary = CTC - monthlyEmpPF;

                // D. Balancing Figure: Other Allowance
                // Total earnings sum up to CTC, but the Net is calculated from Gross Salary
                const calculatedEarnings = monthlyBasic + monthlyHRA + monthlyConveyance + monthlyMedical + monthlyEdu;
                const monthlyOtherAllow = Math.max(0, CTC - calculatedEarnings);

                // --- PRO-RATA APPLICATION (Attendance Based) ---
                components['BASIC'] = monthlyBasic * attendRatio;
                components['HRA'] = monthlyHRA * attendRatio;
                components['CONVEYANCE'] = monthlyConveyance * attendRatio;
                components['MEDICAL'] = monthlyMedical * attendRatio;
                components['EDU_ALL'] = monthlyEdu * attendRatio;
                components['OTHER_ALLOW'] = monthlyOtherAllow * attendRatio;

                // Employer Share (Pro-rated)
                components['PF_ER'] = monthlyEmpPF * attendRatio;

                // Total Earned Salary (Pro-rated CTC)
                totalEarnings = (monthlyBasic + monthlyHRA + monthlyConveyance + monthlyMedical + monthlyEdu + monthlyOtherAllow) * attendRatio;

                // The actual "Gross" for deduction calculation is CTC - ER PF
                const proRatedGross = (monthlyGrossSalary) * attendRatio;
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

            // 4. DEDUCTIONS (Match Excel Image Structure)
            let totalDeductions = 0;

            // PF Employee (Fixed 1800 pro-rated)
            if (employee.isPFEnabled) {
                const pfEmp = Math.round(1800 * attendRatio);
                components['PF_EMP'] = pfEmp;
                totalDeductions += pfEmp;
            }

            // PT (Fixed 200 pro-rated)
            if (employee.isPTEnabled) {
                const pt = Math.round(200 * attendRatio);
                components['PT'] = pt;
                totalDeductions += pt;
            }

            // TDS (Standard 10% of CTC for this structure)
            const tds = Math.round(totalEarnings * 0.10);
            components['TDS'] = tds;
            totalDeductions += tds;

            // Staff Welfare (Fixed 250)
            const welfare = 250;
            components['STAFF_WELFARE'] = welfare;
            totalDeductions += welfare;

            // ESI Employee (Removed as per image - not shown)
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
                },
                create: {
                    tenantId: employee.tenantId,
                    employeeId, month, year,
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
