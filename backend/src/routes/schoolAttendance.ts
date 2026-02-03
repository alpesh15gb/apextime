import express from 'express';
// @ts-ignore
import { StudentAttendanceService } from '../services/studentAttendanceService';
// @ts-ignore
import { SchoolService } from '../services/schoolService';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const attendanceService = new StudentAttendanceService();
const schoolService = new SchoolService();

router.use(authenticate);

/**
 * Trigger Process (Manual Sync from Device Logs)
 */
router.post('/process', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { date } = req.body; // YYYY-MM-DD
        const result = await attendanceService.processDailyAttendance(tenantId, date);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get Daily View
 */
router.get('/daily', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { date } = req.query;
        const result = await attendanceService.getDailyStats(tenantId, date);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Manual Update (Upsert)
 */
router.put('/:studentId', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { status, remarks, date } = req.body;
        const result = await attendanceService.updateAttendance(
            tenantId,
            req.params.studentId,
            new Date(date),
            status,
            remarks
        );
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Link Biometric ID to Student
 */
router.put('/student/:studentId/biometric', async (req: any, res) => {
    try {
        // Using SchoolService roughly to update student, or raw prisma here?
        // Let's assume we can add a method to schoolService or just do it here for speed
        const prisma = require('@prisma/client').PrismaClient;
        const db = new prisma();

        const updated = await db.student.update({
            where: { id: req.params.studentId },
            data: { biometricId: req.body.biometricId }
        });

        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
