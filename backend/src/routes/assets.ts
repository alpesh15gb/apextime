import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AssetService } from '../services/assetService';
import { prisma } from '../config/database';

const router = Router();

// Get All Assets
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const assets = await AssetService.getAssets(tenantId);
        res.json(assets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create Asset
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const asset = await AssetService.createAsset(tenantId, req.body);
        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Assign Asset
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

// Return Asset
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

// Create Category
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

// Get Categories
router.get('/categories', authenticate, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;
        const categories = await prisma.assetCategory.findMany({ where: { tenantId } });
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
