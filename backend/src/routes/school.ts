import express from 'express';
// @ts-ignore
import { SchoolService } from '../services/schoolService';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const schoolService = new SchoolService();

router.use(authenticate);

/**
 * POST /api/school/students
 * Admit a new student
 */
router.post('/students', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const student = await schoolService.admitStudent(tenantId, req.body);
        res.json({ success: true, data: student });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/students', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const students = await schoolService.getStudentsByBatch(tenantId);
        res.json({ success: true, data: students });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/school/students/batch/:batchId
 * Get students by batch
 */
router.get('/students/batch/:batchId', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const students = await schoolService.getStudentsByBatch(tenantId, req.params.batchId);
        res.json({ success: true, data: students });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/school/sessions
 * Create Academic Session
 */
router.post('/sessions', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const session = await schoolService.createSession(tenantId, req.body);
        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/school/courses
 * Create Course (Class)
 */
router.post('/courses', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const course = await schoolService.createCourse(tenantId, req.body);
        res.json({ success: true, data: course });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/school/batches
 * Create Batch (Section)
 */
router.post('/batches', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const batch = await schoolService.createBatch(tenantId, req.body);
        res.json({ success: true, data: batch });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET Data Routes
 */
router.get('/sessions', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const data = await schoolService.getSessions(tenantId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/courses', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const data = await schoolService.getCourses(tenantId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/batches', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { courseId } = req.query;
        const data = await schoolService.getBatches(tenantId, courseId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Subject Routes
 */
router.post('/subjects', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const subject = await schoolService.createSubject(tenantId, req.body);
        res.json({ success: true, data: subject });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/subjects', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { courseId } = req.query;
        const data = await schoolService.getSubjects(tenantId, courseId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
