"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("./config/database");
const logger_1 = __importDefault(require("./config/logger"));
const logSyncService_1 = require("./services/logSyncService");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const departments_1 = __importDefault(require("./routes/departments"));
const shifts_1 = __importDefault(require("./routes/shifts"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const reports_1 = __importDefault(require("./routes/reports"));
const locations_1 = __importDefault(require("./routes/locations"));
const branches_1 = __importDefault(require("./routes/branches"));
const devices_1 = __importDefault(require("./routes/devices"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/departments', departments_1.default);
app.use('/api/shifts', shifts_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/locations', locations_1.default);
app.use('/api/branches', branches_1.default);
app.use('/api/devices', devices_1.default);
app.use('/api/dashboard', dashboard_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
const server = app.listen(PORT, () => {
    logger_1.default.info(`Server running on port ${PORT}`);
    console.log(`ApexTime API Server running on port ${PORT}`);
});
// Schedule log sync every 15 minutes
node_cron_1.default.schedule('*/15 * * * *', async () => {
    logger_1.default.info('Starting scheduled log sync...');
    try {
        await (0, logSyncService_1.startLogSync)();
    }
    catch (error) {
        logger_1.default.error('Scheduled log sync failed:', error);
    }
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    server.close(async () => {
        await database_1.prisma.$disconnect();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    server.close(async () => {
        await database_1.prisma.$disconnect();
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map