"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
// Get all employees
router.get('/', async (req, res) => {
    try {
        const { search, departmentId, branchId, shiftId, isActive, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { employeeCode: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (departmentId)
            where.departmentId = departmentId;
        if (branchId)
            where.branchId = branchId;
        if (shiftId)
            where.shiftId = shiftId;
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        const [employees, total] = await Promise.all([
            database_1.prisma.employee.findMany({
                where,
                include: {
                    department: true,
                    branch: true,
                    shift: true,
                    designation: true,
                    category: true,
                },
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.employee.count({ where }),
        ]);
        res.json({
            employees,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get employee by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await database_1.prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                branch: true,
                shift: true,
                designation: true,
                category: true,
            },
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    }
    catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create employee
router.post('/', [
    (0, express_validator_1.body)('employeeCode').notEmpty().withMessage('Employee code is required'),
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { employeeCode, firstName, lastName, email, phone, branchId, departmentId, designationId, categoryId, shiftId, deviceUserId, dateOfJoining, } = req.body;
        // Check if employee code already exists
        const existing = await database_1.prisma.employee.findUnique({
            where: { employeeCode },
        });
        if (existing) {
            return res.status(400).json({ error: 'Employee code already exists' });
        }
        const employee = await database_1.prisma.employee.create({
            data: {
                employeeCode,
                firstName,
                lastName,
                email,
                phone,
                branchId,
                departmentId,
                designationId,
                categoryId,
                shiftId,
                deviceUserId,
                dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
            },
            include: {
                department: true,
                branch: true,
                shift: true,
                designation: true,
                category: true,
            },
        });
        res.status(201).json(employee);
    }
    catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update employee
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeCode, firstName, lastName, email, phone, branchId, departmentId, designationId, categoryId, shiftId, deviceUserId, dateOfJoining, isActive, } = req.body;
        const employee = await database_1.prisma.employee.update({
            where: { id },
            data: {
                employeeCode,
                firstName,
                lastName,
                email,
                phone,
                branchId,
                departmentId,
                designationId,
                categoryId,
                shiftId,
                deviceUserId,
                dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
                isActive,
            },
            include: {
                department: true,
                branch: true,
                shift: true,
                designation: true,
                category: true,
            },
        });
        res.json(employee);
    }
    catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete employee
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.prisma.employee.delete({
            where: { id },
        });
        res.json({ message: 'Employee deleted successfully' });
    }
    catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=employees.js.map