import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';

import { prisma } from './config/database';
import logger from './config/logger';
import { startLogSync } from './services/logSyncService';

// Import routes
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import departmentRoutes from './routes/departments';
import shiftRoutes from './routes/shifts';
import attendanceRoutes from './routes/attendance';
import reportRoutes from './routes/reports';
import locationRoutes from './routes/locations';
import branchRoutes from './routes/branches';
import deviceRoutes from './routes/devices';
import dashboardRoutes from './routes/dashboard';
import syncRoutes from './routes/sync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sync', syncRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`ApexTime API Server running on port ${PORT}`);
});

// Schedule log sync every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  logger.info('Starting scheduled log sync...');
  try {
    await startLogSync();
  } catch (error) {
    logger.error('Scheduled log sync failed:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
