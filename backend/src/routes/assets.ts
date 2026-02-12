import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AssetService } from '../services/assetService';
import { prisma } from '../config/database';

const router = Router();

// --- DASHBOARD & LIST ---
router.get('/summary', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const summary = await AssetService.getDashboardSummary(tenantId);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const assets = await AssetService.getAssets(tenantId);
        res.json(assets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const asset = await AssetService.getAssetDetail(tenantId, req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const asset = await AssetService.createAsset(tenantId, req.body);
        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- VENDORS ---
router.get('/vendors', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const vendors = await AssetService.getVendors(tenantId);
        res.json(vendors);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/vendors', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const vendor = await AssetService.createVendor(tenantId, req.body);
        res.json(vendor);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- MAINTENANCE ---
router.post('/:id/maintenance', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const log = await AssetService.addMaintenance(tenantId, req.params.id, req.body);
        res.json(log);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- ASSET REQUESTS (Self-Service) ---
router.get('/requests', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const requests = await AssetService.getRequests(tenantId);
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/requests', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const employeeId = (req as any).user.employeeId; // Assuming session has employeeId
        const { categoryId, description, priority } = req.body;
        const request = await AssetService.createAssetRequest(tenantId, employeeId, categoryId, { description, priority });
        res.json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.patch('/requests/:id/status', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const { status, remarks } = req.body;
        const updated = await AssetService.updateRequestStatus(tenantId, req.params.id, status, remarks);
        res.json(updated);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// --- ASSIGNMENTS ---
router.post('/:id/assign', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const { employeeId, remarks } = req.body;
        const assignment = await AssetService.assignAsset(tenantId, req.params.id, employeeId, remarks);
        res.json(assignment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/assignments/:id/return', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const { returnCondition } = req.body;
        await AssetService.returnAsset(tenantId, req.params.id, returnCondition);
        res.json({ message: 'Asset returned successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// --- CATEGORIES ---
router.post('/categories', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const { name, description } = req.body;
        const category = await AssetService.createCategory(tenantId, name, description);
        res.json(category);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/categories', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const categories = await AssetService.getCategories(tenantId);
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        await AssetService.deleteAsset(tenantId, req.params.id);
        res.json({ message: 'Asset deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/categories/:id', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        await AssetService.deleteCategory(tenantId, req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
