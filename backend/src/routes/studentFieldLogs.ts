import express from 'express';
// @ts-ignore
import { StudentFieldLogService } from '../services/studentFieldLogService';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const logService = new StudentFieldLogService();

router.use(authenticate);

/**
 * POST /api/school/field-logs
 * Create a new outdoor check-in
 */
router.post('/', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const log = await logService.createLog(tenantId, req.body);
        res.json({ success: true, data: log });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/school/field-logs/list
 * List logs for approval or history
 */
router.get('/list', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { status } = req.query;
        const logs = await logService.getLogs(tenantId, status as string || 'PENDING');
        res.json({ success: true, data: logs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/school/field-logs/student/:studentId
 * Get history for a specific student
 */
router.get('/student/:studentId', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const logs = await logService.getStudentLogs(tenantId, req.params.studentId);
        res.json({ success: true, data: logs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/school/field-logs/approve
 * Approve or reject a log
 */
router.post('/approve', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { logId, status, isEmployee } = req.body;
        const approvedBy = req.user?.username;
        const result = await logService.approveLog(tenantId, logId, status, approvedBy, isEmployee);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
