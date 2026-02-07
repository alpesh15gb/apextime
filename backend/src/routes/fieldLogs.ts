import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { sendSMS } from '../services/smsService';
import { format } from 'date-fns';

const router = express.Router();

// Apply authentication
router.use(authenticate);

// 1. Submit a Field Punch (Employee)
router.post('/punch', async (req, res) => {
    try {
        const { type, location, image, remarks } = req.body;
        const user = (req as any).user;

        if (user.role !== 'employee' || !user.employeeId) {
            return res.status(403).json({ error: 'Only employees can submit field punches' });
        }

        const fieldLog = await prisma.fieldLog.create({
            data: {
                tenantId: user.tenantId,
                employeeId: user.employeeId,
                type, // 'IN' or 'OUT'
                location,
                image, // Base64 image
                remarks,
                status: 'pending',
                timestamp: new Date() // Store as UTC, let frontend handle display
            }
        });

        res.status(201).json(fieldLog);
    } catch (error) {
        console.error('Field punch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Get Employee's own punches (Employee)
router.get('/my-punches', async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user.employeeId) return res.status(400).json({ error: 'User not linked to employee' });

        const punches = await prisma.fieldLog.findMany({
            where: { employeeId: user.employeeId },
            orderBy: { timestamp: 'desc' },
            take: 20
        });

        res.json(punches);
    } catch (error) {
        console.error('Get punches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. List Punches for Approval (HR/Admin)
router.get('/pending', async (req, res) => {
    try {
        const user = (req as any).user;
        if (user.role === 'employee') return res.status(403).json({ error: 'Access denied' });

        const punches = await prisma.fieldLog.findMany({
            where: { status: 'pending' },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        res.json(punches);
    } catch (error) {
        console.error('Get pending punches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. Accept/Reject Punch (HR/Admin)
router.post('/approve', async (req, res) => {
    try {
        const { logId, status, remarks } = req.body; // status: 'approved' or 'rejected'
        const user = (req as any).user;

        if (user.role === 'employee') return res.status(403).json({ error: 'Access denied' });

        const log = await prisma.fieldLog.findUnique({
            where: { id: logId }
        });

        if (!log) return res.status(404).json({ error: 'Log not found' });

        const updatedLog = await prisma.fieldLog.update({
            where: { id: logId },
            data: {
                status,
                remarks: remarks || log.remarks,
                approvedBy: user.username,
                approvedAt: new Date()
            },
            include: { employee: true }
        });

        // If approved, upsert into AttendanceLog
        if (status === 'approved') {
            const punchDate = new Date(log.timestamp);
            punchDate.setHours(0, 0, 0, 0);

            // Find existing attendance log for that day
            const existingAtt = await prisma.attendanceLog.findUnique({
                where: {
                    employeeId_date_tenantId: {
                        employeeId: log.employeeId,
                        date: punchDate,
                        tenantId: user.tenantId
                    }
                }
            });

            const updateData: any = {};
            if (log.type === 'IN') {
                // Only set firstIn if not already set or if this is earlier
                if (!existingAtt || !existingAtt.firstIn || log.timestamp < existingAtt.firstIn) {
                    updateData.firstIn = log.timestamp;
                }
            } else {
                // Only set lastOut if not already set or if this is later
                if (!existingAtt || !existingAtt.lastOut || log.timestamp > existingAtt.lastOut) {
                    updateData.lastOut = log.timestamp;
                }
            }

            await prisma.attendanceLog.upsert({
                where: {
                    employeeId_date_tenantId: {
                        employeeId: log.employeeId,
                        date: punchDate,
                        tenantId: user.tenantId
                    }
                },
                update: updateData,
                create: {
                    tenantId: user.tenantId,
                    employeeId: log.employeeId,
                    date: punchDate,
                    firstIn: log.type === 'IN' ? log.timestamp : null,
                    lastOut: log.type === 'OUT' ? log.timestamp : null,
                    status: 'present'
                }
            });
        }

        res.json(updatedLog);

        // Send SMS Notification
        if (updatedLog.employee.phone) {
            const timeStr = format(new Date(updatedLog.timestamp), 'HH:mm');
            const statusMsg = status === 'approved' ? 'APPROVED' : 'REJECTED';
            const message = `Your Field Punch (${updatedLog.type}) at ${timeStr} has been ${statusMsg}. - Apextime`;
            sendSMS(updatedLog.employee.phone, message);
        }
    } catch (error) {
        console.error('Approve punch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
