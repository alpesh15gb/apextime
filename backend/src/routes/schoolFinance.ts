import express from 'express';
// @ts-ignore
import { SchoolFinanceService } from '../services/schoolFinanceService';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const financeService = new SchoolFinanceService();

router.use(authenticate);

// --------------------------------------------------------
// FEE HEADS
// --------------------------------------------------------
router.post('/outlines', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await financeService.createFeeHead(tenantId, req.body);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/outlines', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await financeService.getFeeHeads(tenantId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --------------------------------------------------------
// FEE STRUCTURES
// --------------------------------------------------------
router.post('/structures', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await financeService.createFeeStructure(tenantId, req.body);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/structures', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { courseId } = req.query;
        const result = await financeService.getFeeStructures(tenantId, courseId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --------------------------------------------------------
// TRANSACTIONS
// --------------------------------------------------------
router.post('/collect', async (req: any, res) => {
    try {
        const { recordId, amount, mode, transactionId, remarks } = req.body;
        const result = await financeService.collectFee(recordId, amount, mode, transactionId, remarks);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/invoice', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await financeService.generateInvoice(tenantId, req.body);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/student/:studentId', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await financeService.getStudentFees(tenantId, req.params.studentId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/invoices', async (req: any, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const result = await financeService.getInvoices(tenantId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
