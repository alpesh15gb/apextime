"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeSqlPool = exports.getSqlPool = exports.prisma = void 0;
const mssql_1 = __importDefault(require("mssql"));
const client_1 = require("@prisma/client");
// PostgreSQL client (Application Database)
exports.prisma = new client_1.PrismaClient();
// SQL Server configuration (Source Database)
const sqlServerConfig = {
    server: process.env.SQL_SERVER_HOST || '115.98.2.20',
    port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
    user: process.env.SQL_SERVER_USER || 'essl',
    password: process.env.SQL_SERVER_PASSWORD || 'Keystone@456',
    database: process.env.SQL_SERVER_DATABASE || 'etimetracklite1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};
// SQL Server connection pool
let sqlPool = null;
const getSqlPool = async () => {
    if (!sqlPool) {
        try {
            sqlPool = await new mssql_1.default.ConnectionPool(sqlServerConfig).connect();
            console.log('Connected to SQL Server 2008 R2');
        }
        catch (error) {
            console.error('SQL Server connection failed:', error);
            throw error;
        }
    }
    return sqlPool;
};
exports.getSqlPool = getSqlPool;
const closeSqlPool = async () => {
    if (sqlPool) {
        await sqlPool.close();
        sqlPool = null;
        console.log('SQL Server connection closed');
    }
};
exports.closeSqlPool = closeSqlPool;
exports.default = { prisma: exports.prisma, getSqlPool: exports.getSqlPool, closeSqlPool: exports.closeSqlPool };
//# sourceMappingURL=database.js.map