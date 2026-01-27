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
// Get all departments
router.get('/', async (req, res) => {
    try {
        const { branchId, isActive } = req.query;
        const where = {};
        if (branchId)
            where.branchId = branchId;
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        const departments = await database_1.prisma.department.findMany({
            where,
            include: {
                branch: {
                    include: {
                        location: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        res.json(departments);
    }
    catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get department by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const department = await database_1.prisma.department.findUnique({
            where: { id },
            include: {
                branch: true,
                employees: true,
            },
        });
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.json(department);
    }
    catch (error) {
        console.error('Get department error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create department
router.post('/', async (req, res) => {
    try {
        const { name, code, branchId } = req.body;
        const department = await database_1.prisma.department.create({
            data: {
                name,
                code,
                branchId,
            },
            include: {
                branch: true,
            },
        });
        res.status(201).json(department);
    }
    catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update department
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, branchId, isActive } = req.body;
        const department = await database_1.prisma.department.update({
            where: { id },
            data: {
                name,
                code,
                branchId,
                isActive,
            },
            include: {
                branch: true,
            },
        });
        res.json(department);
    }
    catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete department
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.department.delete({
            where: { id },
        });
        res.json({ message: 'Department deleted successfully' });
    }
    catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=departments.js.map