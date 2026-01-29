import express from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const router = express.Router();

router.use(authenticate);

// CEO View: High-level financial and operational analytics
router.get('/ceo-vault', authorize('admin'), async (req, res) => {
    try {
        const now = new Date();
        const startOfCurMonth = startOfMonth(now);
        const endOfCurMonth = endOfMonth(now);

        const lastMonth = subMonths(now, 1);
        const startOfLastMonth = startOfMonth(lastMonth);
        const endOfLastMonth = endOfMonth(lastMonth);

        // 1. Financial Liability (Current Month Generated Payroll)
        const currentPayrollStats = await prisma.payroll.aggregate({
            where: { month: now.getMonth() + 1, year: now.getFullYear() },
            _sum: { netSalary: true, grossSalary: true, totalDeductions: true },
            _count: { id: true }
        });

        // 2. Last Month Final Payout (Comparison)
        const lastMonthStats = await prisma.payroll.aggregate({
            where: { month: lastMonth.getMonth() + 1, year: lastMonth.getFullYear(), status: 'paid' },
            _sum: { netSalary: true },
            _count: { id: true }
        });

        // 3. Department-wise Cost Analysis
        const deptCosts = await prisma.payroll.groupBy({
            by: ['employeeId'], // Note: Prisma doesn't support grouping by relation fields easily in one shot
            where: { month: now.getMonth() + 1, year: now.getFullYear() },
            _sum: { netSalary: true }
        });

        // Fetch depts separately to map
        const depts = await prisma.department.findMany({
            include: {
                employees: {
                    select: { id: true }
                }
            }
        });

        const deptSpend = depts.map(d => {
            const empIds = d.employees.map(e => e.id);
            const total = deptCosts
                .filter(c => empIds.includes(c.employeeId))
                .reduce((acc, curr) => acc + (curr._sum.netSalary || 0), 0);
            return { name: d.name, total: Math.round(total) };
        }).sort((a, b) => b.total - a.total);

        // 4. Headcount Growth (Last 6 Months)
        const headcountTrends = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const count = await prisma.employee.count({
                where: {
                    isActive: true,
                    createdAt: { lte: endOfMonth(date) }
                }
            });
            headcountTrends.push({
                month: date.toLocaleString('default', { month: 'short' }),
                count
            });
        }

        // 5. Recent Critical Audit Logs
        const criticalLogs = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });

        res.json({
            finance: {
                currentLiability: currentPayrollStats._sum.netSalary || 0,
                currentGross: currentPayrollStats._sum.grossSalary || 0,
                currentDeductions: currentPayrollStats._sum.totalDeductions || 0,
                processedCount: currentPayrollStats._count.id,
                lastMonthPayout: lastMonthStats._sum.netSalary || 0
            },
            deptSpend,
            headcountTrends,
            criticalLogs: criticalLogs.map(l => ({
                id: l.id,
                action: l.action,
                user: l.user.username,
                description: l.description,
                time: l.createdAt
            }))
        });

    } catch (error) {
        console.error('CEO Vault error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
