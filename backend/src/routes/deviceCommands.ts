import express from 'express';
// @ts-ignore
import { DeviceCommandService } from '../services/deviceCommandService';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const commandService = new DeviceCommandService();

/**
 * POST /api/devices/:deviceId/upload-employee
 * Upload single employee to device
 */
router.post('/:deviceId/upload-employee', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const command = await commandService.uploadEmployeeToDevice(deviceId, employeeId);

        res.json({
            success: true,
            message: 'Employee upload command queued successfully',
            data: command
        });
    } catch (error: any) {
        console.error('Error uploading employee:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/upload-employees
 * Upload multiple employees to device
 */
router.post('/:deviceId/upload-employees', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;
        const { employeeIds } = req.body;

        if (!employeeIds || !Array.isArray(employeeIds)) {
            return res.status(400).json({
                success: false,
                message: 'Employee IDs array is required'
            });
        }

        const commands = await commandService.uploadMultipleEmployees(deviceId, employeeIds);

        res.json({
            success: true,
            message: `${commands.length} employee upload commands queued`,
            data: commands
        });
    } catch (error: any) {
        console.error('Error uploading employees:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/upload-all-employees
 * Upload all active employees to device
 */
router.post('/:deviceId/upload-all-employees', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];

        const commands = await commandService.uploadAllEmployeesToDevice(deviceId, tenantId);

        res.json({
            success: true,
            message: `${commands.length} employees queued for upload`,
            data: commands
        });
    } catch (error: any) {
        console.error('Error uploading all employees:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/delete-employee
 * Delete employee from device
 */
router.post('/:deviceId/delete-employee', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const command = await commandService.deleteEmployeeFromDevice(deviceId, employeeId);

        res.json({
            success: true,
            message: 'Employee delete command queued successfully',
            data: command
        });
    } catch (error: any) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/clear-all-users
 * Clear all users from device
 */
router.post('/:deviceId/clear-all-users', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;

        const command = await commandService.clearAllUsersFromDevice(deviceId);

        res.json({
            success: true,
            message: 'Clear all users command queued successfully',
            data: command
        });
    } catch (error: any) {
        console.error('Error clearing users:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/sync-time
 * Sync device time with server
 */
router.post('/:deviceId/sync-time', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;

        const command = await commandService.syncDeviceTime(deviceId);

        res.json({
            success: true,
            message: 'Time sync command queued successfully',
            data: command
        });
    } catch (error: any) {
        console.error('Error syncing time:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/restart
 * Restart device
 */
router.post('/:deviceId/restart', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;

        const command = await commandService.restartDevice(deviceId);

        res.json({
            success: true,
            message: 'Restart command queued successfully',
            data: command
        });
    } catch (error: any) {
        console.error('Error restarting device:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/devices/:deviceId/commands
 * Get pending commands for device (called by device)
 */
router.get('/:deviceId/commands', async (req: any, res) => {
    try {
        const { deviceId } = req.params;

        const commands = await commandService.getPendingCommands(deviceId);

        // Format commands for device
        const formattedCommands = commands.map(cmd =>
            commandService.formatCommandForDevice(cmd)
        );

        // Return in format devices expect
        res.set('Content-Type', 'text/plain');
        res.send(formattedCommands.join('\n'));
    } catch (error: any) {
        console.error('Error getting commands:', error);
        res.status(500).send('ERROR');
    }
});

/**
 * POST /api/devices/:deviceId/commands/:commandId/complete
 * Mark command as completed (called by device)
 */
router.post('/:deviceId/commands/:commandId/complete', async (req: any, res) => {
    try {
        const { commandId } = req.params;
        const { result } = req.body;

        await commandService.markCommandCompleted(commandId, result);

        res.json({
            success: true,
            message: 'Command marked as completed'
        });
    } catch (error: any) {
        console.error('Error completing command:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/devices/:deviceId/commands/:commandId/fail
 * Mark command as failed (called by device)
 */
router.post('/:deviceId/commands/:commandId/fail', async (req: any, res) => {
    try {
        const { commandId } = req.params;
        const { error } = req.body;

        await commandService.markCommandFailed(commandId, error);

        res.json({
            success: true,
            message: 'Command marked as failed'
        });
    } catch (error: any) {
        console.error('Error failing command:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/devices/:deviceId/stats
 * Get command statistics for device
 */
router.get('/:deviceId/stats', authenticate, async (req: any, res) => {
    try {
        const { deviceId } = req.params;
        const { hours = 24 } = req.query;

        const stats = await commandService.getCommandStats(deviceId, parseInt(String(hours)));

        res.json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
