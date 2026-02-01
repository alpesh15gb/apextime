import sql from 'mssql';
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../utils/tenantContext';


// PostgreSQL client (Application Database)
export const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: any) {
        if (model === 'Tenant') {
          return query(args);
        }

        const tenantId = getTenantId();

        // If no tenantId is in context, we allow the query (for internal syncs or public routes)
        if (!tenantId) {
          return query(args);
        }

        // Apply tenantId to filters
        if ([
          'findFirst', 'findMany', 'count', 'update', 'updateMany',
          'delete', 'deleteMany', 'aggregate', 'groupBy', 'findUnique'
        ].includes(operation)) {
          args.where = { ...args.where, tenantId };
        }

        // Special handling for upsert (where and create)
        if (operation === 'upsert') {
          args.where = { ...args.where, tenantId };
          if (args.create) args.create = { ...args.create, tenantId };
        }

        // Inject tenantId into creation data
        if (operation === 'create') {
          args.data = { ...args.data, tenantId };
        }

        if (operation === 'createMany') {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((d: any) => ({ ...d, tenantId }));
          } else if (args.data) {
            args.data = { ...args.data, tenantId };
          }
        }

        return query(args);
      }
    }
  }
});

export interface BiometricConfig {
  server: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

const baseConfig = {
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

// SQL Server connection pool management
const pools = new Map<string, sql.ConnectionPool>();

export const getDynamicSqlPool = async (config: BiometricConfig, key: string): Promise<sql.ConnectionPool> => {
  if (pools.has(key)) {
    const existingPool = pools.get(key)!;
    if (existingPool.connected) return existingPool;
    pools.delete(key);
  }

  try {
    const pool = await new sql.ConnectionPool({
      ...baseConfig,
      server: config.server,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    }).connect();
    pools.set(key, pool);
    return pool;
  } catch (error) {
    console.error(`Dynamic SQL Server connection failed for ${key}:`, error);
    throw error;
  }
};

// Legacy support or fallback to env for backward compatibility
const sqlServerConfig: sql.config = {
  ...baseConfig,
  server: process.env.SQL_SERVER_HOST || '115.98.2.20',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  user: process.env.SQL_SERVER_USER || 'essl',
  password: process.env.SQL_SERVER_PASSWORD || 'Keystone@456',
  database: process.env.SQL_SERVER_DATABASE || 'etimetracklite1',
};

let defaultSqlPool: sql.ConnectionPool | null = null;

export const getSqlPool = async (): Promise<sql.ConnectionPool> => {
  if (!defaultSqlPool) {
    defaultSqlPool = await new sql.ConnectionPool(sqlServerConfig).connect();
  }
  return defaultSqlPool;
};

// HikCentral dynamic pool
export const getDynamicHikPool = async (config: BiometricConfig, key: string): Promise<sql.ConnectionPool> => {
  const hikKey = `hik_${key}`;
  if (pools.has(hikKey)) {
    const existingPool = pools.get(hikKey)!;
    if (existingPool.connected) return existingPool;
    pools.delete(hikKey);
  }

  try {
    const pool = await new sql.ConnectionPool({
      ...baseConfig,
      server: config.server,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    }).connect();
    pools.set(hikKey, pool);
    return pool;
  } catch (error) {
    console.error(`Dynamic HikCentral connection failed for ${key}:`, error);
    throw error;
  }
};

const hikCentralConfig: sql.config = {
  ...baseConfig,
  server: process.env.HIK_SERVER_HOST || '115.98.2.20',
  port: parseInt(process.env.HIK_SERVER_PORT || '1433'),
  user: process.env.HIK_SERVER_USER || 'essl',
  password: process.env.HIK_SERVER_PASSWORD || 'Keystone@456',
  database: process.env.HIK_SERVER_DATABASE || 'hikcentral',
};

let defaultHikCentralPool: sql.ConnectionPool | null = null;

export const getHikCentralPool = async (): Promise<sql.ConnectionPool> => {
  if (!defaultHikCentralPool) {
    defaultHikCentralPool = await new sql.ConnectionPool(hikCentralConfig).connect();
  }
  return defaultHikCentralPool;
};

export const closeAllPools = async (): Promise<void> => {
  for (const [key, pool] of pools.entries()) {
    await pool.close();
  }
  pools.clear();
  if (defaultSqlPool) await defaultSqlPool.close();
  if (defaultHikCentralPool) await defaultHikCentralPool.close();
};

export default { prisma, getSqlPool, getDynamicSqlPool, getDynamicHikPool, closeAllPools };
