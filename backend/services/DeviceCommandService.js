const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Device Command Service
 * Manages commands to be sent to biometric devices
 * Supports: Upload Users, Delete Users, Sync Time, Restart, etc.
 */

class DeviceCommandService {
    /**
     * Queue a command for a device
     * @param {string} deviceId - Device ID
     * @param {string} commandType - Command type (UPLOAD_USER, DELETE_USER, SYNC_TIME, etc.)
     * @param {object} payload - Command payload
     */
    async queueCommand(deviceId, commandType, payload = {}) {
        console.log(`📤 Queuing command ${commandType} for device ${deviceId}`);

        const command = await prisma.deviceCommand.create({
            data: {
                deviceId,
                commandType,
                payload: JSON.stringify(payload),
                status: 'PENDING',
                createdAt: new Date(),
                priority: this.getCommandPriority(commandType)
            }
        });

        console.log(`✅ Command queued: ${command.id}`);
        return command;
    }

    /**
     * Upload employee to device
     * @param {string} deviceId - Device ID
     * @param {string} employeeId - Employee ID
     */
    async uploadEmployeeToDevice(deviceId, employeeId) {
        // Get employee details
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                department: true,
                designation: true
            }
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        // Prepare user data for device
        const userData = {
            userId: employee.deviceUserId || employee.employeeCode,
            name: `${employee.firstName} ${employee.lastName}`,
            cardNo: employee.cardNumber || '',
            department: employee.department?.name || '',
            role: employee.designation?.name || '',
            password: '', // Optional PIN
            privilege: 0, // 0=User, 14=Admin
            enabled: employee.isActive ? 1 : 0
        };

        return this.queueCommand(deviceId, 'UPLOAD_USER', userData);
    }

    /**
     * Upload multiple employees to device
     */
    async uploadMultipleEmployees(deviceId, employeeIds) {
        const commands = [];

        for (const employeeId of employeeIds) {
            try {
                const command = await this.uploadEmployeeToDevice(deviceId, employeeId);
                commands.push(command);
            } catch (error) {
                console.error(`Error uploading employee ${employeeId}:`, error.message);
            }
        }

        return commands;
    }

    /**
     * Upload all employees to device
     */
    async uploadAllEmployeesToDevice(deviceId, tenantId) {
        const employees = await prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true
            },
            select: {
                id: true
            }
        });

        const employeeIds = employees.map(e => e.id);
        return this.uploadMultipleEmployees(deviceId, employeeIds);
    }

    /**
     * Delete employee from device
     */
    async deleteEmployeeFromDevice(deviceId, employeeId) {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId }
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        const payload = {
            userId: employee.deviceUserId || employee.employeeCode
        };

        return this.queueCommand(deviceId, 'DELETE_USER', payload);
    }

    /**
     * Clear all users from device
     */
    async clearAllUsersFromDevice(deviceId) {
        return this.queueCommand(deviceId, 'CLEAR_ALL_USERS', {});
    }

    /**
     * Sync device time
     */
    async syncDeviceTime(deviceId) {
        const payload = {
            timestamp: new Date().toISOString()
        };

        return this.queueCommand(deviceId, 'SYNC_TIME', payload);
    }

    /**
     * Restart device
     */
    async restartDevice(deviceId) {
        return this.queueCommand(deviceId, 'RESTART', {});
    }

    /**
     * Get pending commands for device
     */
    async getPendingCommands(deviceId) {
        const commands = await prisma.deviceCommand.findMany({
            where: {
                deviceId,
                status: 'PENDING'
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ],
            take: 10 // Limit to 10 commands per poll
        });

        return commands;
    }

    /**
     * Mark command as completed
     */
    async markCommandCompleted(commandId, result = null) {
        return prisma.deviceCommand.update({
            where: { id: commandId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                result: result ? JSON.stringify(result) : null
            }
        });
    }

    /**
     * Mark command as failed
     */
    async markCommandFailed(commandId, error) {
        return prisma.deviceCommand.update({
            where: { id: commandId },
            data: {
                status: 'FAILED',
                completedAt: new Date(),
                error: error
            }
        });
    }

    /**
     * Get command priority
     */
    getCommandPriority(commandType) {
        const priorities = {
            'RESTART': 10,
            'SYNC_TIME': 9,
            'CLEAR_ALL_USERS': 8,
            'DELETE_USER': 7,
            'UPLOAD_USER': 5,
            'GET_LOGS': 3,
            'GET_USERS': 2
        };

        return priorities[commandType] || 1;
    }

    /**
     * Get command statistics
     */
    async getCommandStats(deviceId, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const stats = await prisma.deviceCommand.groupBy({
            by: ['status'],
            where: {
                deviceId,
                createdAt: {
                    gte: since
                }
            },
            _count: true
        });

        return {
            pending: stats.find(s => s.status === 'PENDING')?._count || 0,
            completed: stats.find(s => s.status === 'COMPLETED')?._count || 0,
            failed: stats.find(s => s.status === 'FAILED')?._count || 0
        };
    }

    /**
     * Format command for device (ZKTeco format)
     */
    formatCommandForDevice(command) {
        const { commandType, payload } = command;
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        switch (commandType) {
            case 'UPLOAD_USER':
                // Format: C:ID:userId:name:cardNo:privilege:password
                return `C:${command.id}:DATA USER PIN=${data.userId}\tName=${data.name}\tPri=${data.privilege}\tPasswd=${data.password}\tCard=${data.cardNo}\tGrp=${data.department}`;

            case 'DELETE_USER':
                // Format: C:ID:userId
                return `C:${command.id}:DATA DELETE USER PIN=${data.userId}`;

            case 'CLEAR_ALL_USERS':
                return `C:${command.id}:DATA DELETE USER`;

            case 'SYNC_TIME':
                const time = new Date(data.timestamp);
                const timeStr = time.toISOString().replace('T', ' ').substring(0, 19);
                return `C:${command.id}:DATA UPDATE STIME ${timeStr}`;

            case 'RESTART':
                return `C:${command.id}:DATA RESTART`;

            case 'GET_LOGS':
                return `C:${command.id}:DATA QUERY ATTLOG`;

            case 'GET_USERS':
                return `C:${command.id}:DATA QUERY USERINFO`;

            default:
                return `C:${command.id}:${commandType}`;
        }
    }
}

module.exports = DeviceCommandService;
