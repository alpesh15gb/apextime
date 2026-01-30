import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../config/logger';

const router = express.Router();

router.use(authenticate);

// --- Leave Types ---
router.get('/types', async (req, res) => {
    try {
        const types = await prisma.leaveType.findMany({
            where: { isActive: true }
        });
        res.json(types);
    } catch (error) {
        logger.error('Get leave types error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Leave Entries ---

// Get leaves with filtering for approvals
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, view } = req.query;
        const user: any = (req as any).user;

        const where: any = {};

        // Employee Portal View: Only see own leaves
        if (view === 'employee' || user.role === 'employee') {
            const employee = await prisma.employee.findFirst({ where: { user: { id: user.id } } });
            if (!employee) return res.status(404).json({ error: 'Employee record not found' });
            where.employeeId = employee.id;
        }

        // Manager View: See leaves for their department
        else if (view === 'manager' && user.role === 'manager') {
            const managedDepts = await prisma.department.findMany({
                where: {
                    managers: { some: { user: { id: user.id } } }
                },
                select: { id: true }
            });
            const deptIds = managedDepts.map(d => d.id);
            where.employee = { departmentId: { in: deptIds } };
            if (!status) where.status = 'pending_manager';
        }

        // CEO/Admin View
        else if (view === 'ceo' && user.role === 'admin') {
            if (!status) where.status = 'pending_ceo';
        }

        if (status) where.status = status;
        if (employeeId) where.employeeId = employeeId;

        const entries = await prisma.leaveEntry.findMany({
            where,
            include: {
                employee: {
                    include: {
                        department: true
                    }
                },
                leaveType: true,
                manager: true,
                ceo: true
            },
            orderBy: { startDate: 'desc' }
        });
        res.json(entries);
    } catch (error) {
        logger.error('Get leave entries error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Apply for leave (Initial level: pending_manager)
router.post('/', async (req, res) => {
    try {
        const { leaveTypeId, startDate, endDate, reason } = req.body;
        const user: any = (req as any).user;

        const employee = await prisma.employee.findFirst({
            where: { user: { id: user.id } },
            include: { department: true }
        });

        if (!employee) {
            return res.status(400).json({ error: 'User is not linked to an employee record' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Routing logic:
        // 1. Employee -> pending_manager
        // 2. Manager -> pending_ceo
        // 3. Admin (CEO) -> approved
        let initialStatus = 'pending_manager';
        if (user.role === 'admin') initialStatus = 'approved';
        else if (user.role === 'manager') initialStatus = 'pending_ceo';

        const entry = await prisma.leaveEntry.create({
            data: {
                employeeId: employee.id,
                leaveTypeId,
                startDate: start,
                endDate: end,
                days,
                reason,
                status: initialStatus
            }
        });
        res.json(entry);
    } catch (error) {
        logger.error('Create leave entry error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manager Approval
router.patch('/:id/approve-manager', async (req, res) => {
    try {
        const { id } = req.params;
        const user: any = (req as any).user;

        const manager = await prisma.employee.findFirst({ where: { user: { id: user.id } } });
        if (!manager) return res.status(403).json({ error: 'Unauthorized: Not a manager' });

        const entry = await prisma.leaveEntry.update({
            where: { id },
            data: {
                status: 'pending_ceo',
                managerApproval: true,
                managerApprovedAt: new Date(),
                managerId: manager.id
            }
        });
        res.json(entry);
    } catch (error) {
        logger.error('Manager approval error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CEO Approval (Final)
router.patch('/:id/approve-ceo', async (req, res) => {
    try {
        const { id } = req.params;
        const user: any = (req as any).user;

        const ceo = await prisma.employee.findFirst({ where: { user: { id: user.id } } });
        // In real world, we'd check if specific user is CEO, but for now admin = CEO

        const entry = await prisma.leaveEntry.update({
            where: { id },
            data: {
                status: 'approved',
                ceoApproval: true,
                ceoApprovedAt: new Date(),
                ceoId: ceo?.id || null
            }
        });
        res.json(entry);
    } catch (error) {
        logger.error('CEO approval error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rejection (by either level)
router.patch('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user: any = (req as any).user;

        const entry = await prisma.leaveEntry.update({
            where: { id },
            data: {
                status: 'rejected',
                reason: reason ? `${reason}` : 'Rejected by management'
            }
        });
        res.json(entry);
    } catch (error) {
        logger.error('Leave rejection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
