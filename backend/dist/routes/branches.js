"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Get all branches
router.get('/', async (req, res) => {
    try {
        const { locationId, isActive } = req.query;
        const where = {};
        if (locationId)
            where.locationId = locationId;
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        const branches = await database_1.prisma.branch.findMany({
            where,
            include: {
                location: true,
                departments: {
                    where: { isActive: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        res.json(branches);
    }
    catch (error) {
        console.error('Get branches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get branch by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const branch = await database_1.prisma.branch.findUnique({
            where: { id },
            include: {
                location: true,
                departments: true,
                employees: true,
            },
        });
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }
        res.json(branch);
    }
    catch (error) {
        console.error('Get branch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create branch
router.post('/', async (req, res) => {
    try {
        const { name, code, locationId } = req.body;
        const branch = await database_1.prisma.branch.create({
            data: {
                name,
                code,
                locationId,
            },
            include: {
                location: true,
            },
        });
        res.status(201).json(branch);
    }
    catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update branch
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, locationId, isActive } = req.body;
        const branch = await database_1.prisma.branch.update({
            where: { id },
            data: {
                name,
                code,
                locationId,
                isActive,
            },
            include: {
                location: true,
            },
        });
        res.json(branch);
    }
    catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete branch
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.branch.delete({
            where: { id },
        });
        res.json({ message: 'Branch deleted successfully' });
    }
    catch (error) {
        console.error('Delete branch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=branches.js.map