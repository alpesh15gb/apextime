"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Get all devices
router.get('/', async (req, res) => {
    try {
        const { isActive, status } = req.query;
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        if (status)
            where.status = status;
        const devices = await database_1.prisma.device.findMany({
            where,
            include: {
                deviceUsers: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(devices);
    }
    catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get device by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const device = await database_1.prisma.device.findUnique({
            where: { id },
            include: {
                deviceUsers: true,
            },
        });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json(device);
    }
    catch (error) {
        console.error('Get device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create device
router.post('/', async (req, res) => {
    try {
        const { deviceId, name, ipAddress, port, location } = req.body;
        const device = await database_1.prisma.device.create({
            data: {
                deviceId,
                name,
                ipAddress,
                port,
                location,
            },
        });
        res.status(201).json(device);
    }
    catch (error) {
        console.error('Create device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update device
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceId, name, ipAddress, port, location, isActive, status } = req.body;
        const device = await database_1.prisma.device.update({
            where: { id },
            data: {
                deviceId,
                name,
                ipAddress,
                port,
                location,
                isActive,
                status,
            },
        });
        res.json(device);
    }
    catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete device
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.device.delete({
            where: { id },
        });
        res.json({ message: 'Device deleted successfully' });
    }
    catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Sync device users from SQL Server
router.post('/sync-users', async (req, res) => {
    try {
        const { getSqlPool } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const pool = await getSqlPool();
        // Query DeviceUsers from SQL Server
        const result = await pool.request().query(`
      SELECT DeviceId, UserId, Name
      FROM DeviceUsers
      WHERE IsActive = 1
    `);
        const deviceUsers = result.recordset;
        // Sync to PostgreSQL
        for (const user of deviceUsers) {
            await database_1.prisma.deviceUser.upsert({
                where: {
                    deviceId_deviceUserId: {
                        deviceId: user.DeviceId.toString(),
                        deviceUserId: user.UserId.toString(),
                    },
                },
                update: {
                    name: user.Name,
                },
                create: {
                    deviceId: user.DeviceId.toString(),
                    deviceUserId: user.UserId.toString(),
                    name: user.Name,
                },
            });
        }
        res.json({
            message: 'Device users synced successfully',
            count: deviceUsers.length
        });
    }
    catch (error) {
        console.error('Sync device users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map