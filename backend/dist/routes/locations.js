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
// Get all locations
router.get('/', async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        const locations = await database_1.prisma.location.findMany({
            where,
            include: {
                branches: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(locations);
    }
    catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get location by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const location = await database_1.prisma.location.findUnique({
            where: { id },
            include: {
                branches: true,
            },
        });
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(location);
    }
    catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create location
router.post('/', async (req, res) => {
    try {
        const { name, address, city, state, country, zipCode } = req.body;
        const location = await database_1.prisma.location.create({
            data: {
                name,
                address,
                city,
                state,
                country,
                zipCode,
            },
        });
        res.status(201).json(location);
    }
    catch (error) {
        console.error('Create location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update location
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, city, state, country, zipCode, isActive } = req.body;
        const location = await database_1.prisma.location.update({
            where: { id },
            data: {
                name,
                address,
                city,
                state,
                country,
                zipCode,
                isActive,
            },
        });
        res.json(location);
    }
    catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete location
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.location.delete({
            where: { id },
        });
        res.json({ message: 'Location deleted successfully' });
    }
    catch (error) {
        console.error('Delete location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=locations.js.map