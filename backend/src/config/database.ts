import sql from 'mssql';
import { PrismaClient } from '@prisma/client';

// PostgreSQL client (Application Database)
export const prisma = new PrismaClient();

// SQL Server configuration (Source Database)
const sqlServerConfig: sql.config = {
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
let sqlPool: sql.ConnectionPool | null = null;

export const getSqlPool = async (): Promise<sql.ConnectionPool> => {
  if (!sqlPool) {
    try {
      sqlPool = await new sql.ConnectionPool(sqlServerConfig).connect();
      console.log('Connected to SQL Server 2008 R2');
    } catch (error) {
      console.error('SQL Server connection failed:', error);
      throw error;
    }
  }
  return sqlPool;
};

export const closeSqlPool = async (): Promise<void> => {
  if (sqlPool) {
    await sqlPool.close();
    sqlPool = null;
    console.log('SQL Server connection closed');
  }
};

export default { prisma, getSqlPool, closeSqlPool };

// HikCentral Database configuration
const hikCentralConfig: sql.config = {
  server: process.env.HIK_SERVER_HOST || '115.98.2.20',
  port: parseInt(process.env.HIK_SERVER_PORT || '1433'),
  user: process.env.HIK_SERVER_USER || 'essl',
  password: process.env.HIK_SERVER_PASSWORD || 'Keystone@456',
  database: process.env.HIK_SERVER_DATABASE || 'hikcentral',
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

let hikCentralPool: sql.ConnectionPool | null = null;

export const getHikCentralPool = async (): Promise<sql.ConnectionPool> => {
  if (!hikCentralPool) {
    try {
      hikCentralPool = await new sql.ConnectionPool(hikCentralConfig).connect();
      console.log('Connected to HikCentral Database');
    } catch (error) {
      console.error('HikCentral connection failed:', error);
      throw error;
    }
  }
  return hikCentralPool;
};

export const closeHikCentralPool = async (): Promise<void> => {
  if (hikCentralPool) {
    await hikCentralPool.close();
    hikCentralPool = null;
    console.log('HikCentral connection closed');
  }
};
