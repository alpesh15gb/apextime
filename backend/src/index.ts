import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { prisma } from './config/database';
import logger from './config/logger';
import { startLogSync } from './services/logSyncService';
import { reconcileAttendance } from './services/attendanceReconciliationService';
import { performBackup } from './services/backupService';

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
import holidayRoutes from './routes/holidays';
import fixDuplicatesRoutes from './routes/fixDuplicates';
import updateNamesRoutes from './routes/updateNames';
import manualUpdateNamesRoutes from './routes/manualUpdateNames';
import payrollRoutes from './routes/payroll';
import leaveRoutes from './routes/leaves';
import ceoRoutes from './routes/ceo';
import fieldLogRoutes from './routes/fieldLogs';
import designationRoutes from './routes/designations';
import settingsRoutes from './routes/settings';
import tenantRoutes from './routes/tenants';
import iclockRoutes from './routes/iclock';
import hikvisionRoutes from './routes/hikvision';
import documentRoutes from './routes/documents';
import loanRoutes from './routes/loans';
import assetRoutes from './routes/assets';
import attendanceAdvancedRoutes from './routes/attendanceAdvanced';
import deviceCommandsRoutes from './routes/deviceCommands';
import schoolRoutes from './routes/school';
import schoolFinanceRoutes from './routes/schoolFinance';
import schoolAttendanceRoutes from './routes/schoolAttendance';
import transportRoutes from './routes/transport';
import libraryRoutes from './routes/library';
import studentFieldLogRoutes from './routes/studentFieldLogs';
import realtimeRoutes, { initializeRealtimeWebSocket } from './routes/realtime';
import recruitmentRoutes from './routes/recruitment';
import performanceRoutes from './routes/performance';
import communicationRoutes from './routes/communication';
import expenseRoutes from './routes/expenses';
import trainingRoutes from './routes/training';
import helpdeskRoutes from './routes/helpdesk';
import visitorRoutes from './routes/visitors';
import onboardingRoutes from './routes/onboarding';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());

// AGGRESSIVE RAW BUFFERING (GLOBAL CHECK)
// AGGRESSIVE RAW BUFFERING (DISABLED TO FIX STREAM ERROR)
// app.use((req, res, next) => {
//   // Check if this is an iclock request
//   if (req.path.startsWith('/api/iclock') && req.method === 'POST') {
//     console.log('--- INTERCEPTED /api/iclock POST ---');
//     const data: any[] = [];
//     req.on('data', (chunk) => {
//       data.push(chunk);
//     });
//     req.on('end', () => {
//       if (data.length > 0) {
//         req.body = Buffer.concat(data);
//         console.log('--- CUSTOM BUFFERING: Captured ' + req.body.length + ' bytes for iclock ---');
//       } else {
//         console.log('--- CUSTOM BUFFERING: No data received in stream ---');
//       }
//       next();
//     });
//   } else {
//     next();
//   }
// });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ type: ['text/xml', 'application/xml', 'application/json-error', 'text/plain'], limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/holidays', holidayRoutes);
app.use('/api/fix-duplicates', fixDuplicatesRoutes);
app.use('/api/update-names', updateNamesRoutes);
app.use('/api/manual-update-names', manualUpdateNamesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/field-logs', fieldLogRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tenants', tenantRoutes);
// Specialized Raw Body Parser for iClock (Only for POST/PUT data)
app.use(['/api/iclock', '/iclock'], (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return express.raw({ type: '*/*', limit: '20mb' })(req, res, next);
  }
  next();
});

// Middleware to ensure raw body is a string for processing (only for iclock)
app.use(['/api/iclock', '/iclock'], (req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.body = req.body.toString('utf8');
  }
  next();
});

// Biometric Routes
app.use('/api/iclock', iclockRoutes);
app.use('/iclock', iclockRoutes);
app.use('/api/hikvision', hikvisionRoutes);
app.use('/hikvision', hikvisionRoutes);
app.use('/api/realtime', realtimeRoutes);

// Other Routes
app.use('/api/documents', documentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/attendance', attendanceAdvancedRoutes);
app.use('/api/devices', deviceCommandsRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/school/finance', schoolFinanceRoutes);
app.use('/api/school/attendance', schoolAttendanceRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/school/field-logs', studentFieldLogRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/onboarding', onboardingRoutes);



// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.6-sn-in-url',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/testing', (req, res) => {
  res.send('DIRECT TEST WORKING');
});

app.get('/api/hik-test', (req, res) => {
  res.send('TOP LEVEL HIK TEST WORKING');
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

// Initialize WebSocket for RealTime Devices
initializeRealtimeWebSocket(server);

// Schedule log sync every 15 minutes - TEMPORARILY DISABLED TO STOP LOG NOISE
// cron.schedule('*/15 * * * *', async () => {
//   logger.info('Starting scheduled log sync...');
//   try {
//     await startLogSync();
//   } catch (error) {
//     logger.error('Scheduled log sync failed:', error);
//   }
// });

// Nightly Attendance Reconciliation (at 23:30)
cron.schedule('30 23 * * *', async () => {
  logger.info('Starting nightly attendance reconciliation...');
  try {
    await reconcileAttendance();
  } catch (error) {
    logger.error('Nightly reconciliation failed:', error);
  }
});

// Nightly System Backup (at 02:00)
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting nightly system backup...');
  try {
    await performBackup();
  } catch (error) {
    logger.error('Nightly backup failed:', error);
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
