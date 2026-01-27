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
// Get all shifts
router.get('/', async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        const shifts = await database_1.prisma.shift.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        res.json(shifts);
    }
    catch (error) {
        console.error('Get shifts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get shift by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await database_1.prisma.shift.findUnique({
            where: { id },
            include: {
                employees: true,
            },
        });
        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        res.json(shift);
    }
    catch (error) {
        console.error('Get shift error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create shift
router.post('/', async (req, res) => {
    try {
        const { name, startTime, endTime, gracePeriodIn, gracePeriodOut, isNightShift, } = req.body;
        const shift = await database_1.prisma.shift.create({
            data: {
                name,
                startTime,
                endTime,
                gracePeriodIn: gracePeriodIn || 0,
                gracePeriodOut: gracePeriodOut || 0,
                isNightShift: isNightShift || false,
            },
        });
        res.status(201).json(shift);
    }
    catch (error) {
        console.error('Create shift error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update shift
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, startTime, endTime, gracePeriodIn, gracePeriodOut, isNightShift, isActive, } = req.body;
        const shift = await database_1.prisma.shift.update({
            where: { id },
            data: {
                name,
                startTime,
                endTime,
                gracePeriodIn,
                gracePeriodOut,
                isNightShift,
                isActive,
            },
        });
        res.json(shift);
    }
    catch (error) {
        console.error('Update shift error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete shift
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.shift.delete({
            where: { id },
        });
        res.json({ message: 'Shift deleted successfully' });
    }
    catch (error) {
        console.error('Delete shift error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=shifts.js.map