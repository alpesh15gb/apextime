
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import logger from '../config/logger';

const execPromise = util.promisify(exec);

export const performBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups');
    const uploadsDir = path.join(__dirname, '../../uploads');

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbBackupFile = path.join(backupDir, `db-backup-${timestamp}.sql`);
    const filesBackupFile = path.join(backupDir, `files-backup-${timestamp}.zip`);

    logger.info('Starting system backup...');

    try {
        // 1. Backup Database (PostgreSQL)
        // Using environment variables from process.env which docker-compose supplies
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
            // pg_dump needs connection string or params. 
            // Since we are in the backend container, we can reach 'postgres' host.
            // Format: pg_dump postgresql://user:pass@host:port/dbname > file.sql
            logger.info('Dumping database...');
            await execPromise(`pg_dump "${dbUrl}" > "${dbBackupFile}"`);
        }

        // 2. Backup Uploads Directory
        if (fs.existsSync(uploadsDir)) {
            logger.info('Archiving uploaded files...');
            // Zip the uploads directory
            // -r recursive, -q quiet
            await execPromise(`zip -r -q "${filesBackupFile}" "${uploadsDir}"`);
        }

        logger.info(`Backup completed successfully: ${timestamp}`);

        // 3. Clean up old backups (> 30 days)
        cleanOldBackups(backupDir);

    } catch (error) {
        logger.error('Backup failed:', error);
    }
};

const cleanOldBackups = (dir: string) => {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = Date.now();

    fs.readdir(dir, (err, files) => {
        if (err) return;

        files.forEach(file => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlink(filePath, () => logger.info(`Deleted old backup: ${file}`));
                }
            });
        });
    });
};
