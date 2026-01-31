import { prisma } from '../config/database';
import { Employee, Payroll, AttendanceLog, LeaveEntry } from '@prisma/client';

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

            const effectivePresentDays = presentDays + weeklyOffs + holidays + leaves + (halfDayCount * 0.5);
            const lopDays = Math.max(0, daysInMonth - effectivePresentDays);
            const paidDays = Math.max(0, daysInMonth - lopDays);

            // 2. Calculate Earnings
            let totalEarnings = 0;
            const components: any = {};

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

            // PT Calculation
            if (employee.isPTEnabled) {
                let ptAmount = 0;
                if (totalEarnings > 12000) ptAmount = 200;
                else if (totalEarnings > 9000) ptAmount = 150;
                components['PT'] = ptAmount;
                totalDeductions += ptAmount;
            }

            const netSalary = Math.round(totalEarnings - totalDeductions);

            // 4. Save to Database
            const allowancesPaid = Math.round(totalEarnings - (components['BASIC'] || 0) - (components['HRA'] || 0) - otAmount);

            const payroll = await prisma.payroll.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId,
                        month,
                        year
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
                    basicPaid: Math.round(components['BASIC'] || 0),
                    hraPaid: Math.round(components['HRA'] || 0),
                    allowancesPaid: Math.max(0, allowancesPaid),
                    pfDeduction: components['PF_EMP'] || 0,
                    esiDeduction: components['ESI_EMP'] || 0,
                    ptDeduction: components['PT'] || 0,
                    employerPF: components['PF_ER'] || 0,
                    employerESI: components['ESI_ER'] || 0,
                    otHours: totalOtHours,
                    otPay: Math.round(otAmount)
                },
                create: {
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
                    basicPaid: Math.round(components['BASIC'] || 0),
                    hraPaid: Math.round(components['HRA'] || 0),
                    allowancesPaid: Math.max(0, allowancesPaid),
                    pfDeduction: components['PF_EMP'] || 0,
                    esiDeduction: components['ESI_EMP'] || 0,
                    ptDeduction: components['PT'] || 0,
                    employerPF: components['PF_ER'] || 0,
                    employerESI: components['ESI_ER'] || 0,
                    otHours: totalOtHours,
                    otPay: Math.round(otAmount)
                }
            });

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
