"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const router = express_1.default.Router();
// Login
router.post('/login', [
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password } = req.body;
        // Find user
        const user = await database_1.prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT
        const secret = process.env.JWT_SECRET || 'apextime-secret-key-2026';
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, secret, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Change password
router.post('/change-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        const user = await database_1.prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map