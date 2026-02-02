import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

/**
 * ADMS / iClock Protocol Handler
 * This allows biometric devices to PUSH data directly to the server.
 * Supports ESSL, Matrix (Direct), and Realtime (Direct) devices using the iClock protocol.
 */

// 1. Initial Handshake / Config Check
router.get('/cdata', async (req, res) => {
    const { SN, options } = req.query;

    if (!SN) {
        return res.status(400).send('Missing SN');
    }

    const device = await prisma.device.findFirst({
        where: { deviceId: SN as string }
    });

    if (!device) {
        logger.warn(`Unknown device SN checking in: ${SN}`);
        return res.send('OK');
    }

    // Update status to online and last connected
    await prisma.device.update({
        where: { id: device.id },
        data: { status: 'online', lastSeen: new Date() }
    });

    if (options === 'all') {
        const response = [
            'GET OPTION FROM: ' + SN,
            'Stamp=9999',
            'OpStamp=9999',
            'PhotoStamp=9999',
            'ErrorDelay=30',
            'Delay=30',
            'TransTimes=00:00;14:00',
            'TransInterval=1',
            'TransFlag=1111111111',
            'Realtime=1',
            'Encrypt=0'
        ].join('\n');
        return res.send(response);
    }

    res.send('OK');
});

// 2. Data Receiving (Logs, User Info, OpLogs)
router.post('/cdata', async (req, res) => {
    const { SN, table } = req.query;

    if (!SN) return res.send('OK');

    const device = await prisma.device.findFirst({
        where: { deviceId: SN as string }
    });

    if (!device) {
        logger.warn(`PUSH: Data received from unknown device SN ${SN}`);
        return res.send('OK');
    }

    // ADMS sends data in the body as a string (often tab-separated)
    let body = req.body;

    // Safety: Handle cases where machine might send it as a buffer or differently
    if (Buffer.isBuffer(body)) {
        body = body.toString('utf8');
    }

    if (typeof body === 'string' && body.length > 0) {
        const lines = body.split('\n');
        let count = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split('\t');

            // Handling ATTLOG (Attendance Logs)
            // Typical format: UserID  Time  Status  PunchType
            if (table === 'ATTLOG' || !table) {
                if (parts.length >= 2) {
                    const userId = parts[0];
                    const punchTime = new Date(parts[1]);

                    if (!isNaN(punchTime.getTime())) {
                        // AUTO-CREATE EMPLOYEE LOGIC
                        // improved to handle unknown users instantly
                        let employee = await prisma.employee.findFirst({
                            where: {
                                tenantId: device.tenantId,
                                deviceUserId: userId
                            }
                        });

                        if (!employee) {
                            try {
                                logger.info(`ADMS Auto-Create: Found new user ${userId} from device ${SN}. Creating profile...`);

                                // Default Shift (General Shift)
                                const defaultShift = await prisma.shift.findFirst({
                                    where: { tenantId: device.tenantId, isDefault: true }
                                });

                                employee = await prisma.employee.create({
                                    data: {
                                        tenantId: device.tenantId,
                                        firstName: `Auto-User ${userId}`,
                                        lastName: '(Device)',
                                        employeeCode: userId,
                                        deviceUserId: userId,
                                        designationId: null,
                                        departmentId: null,
                                        gender: 'Male',
                                        type: 'FullTime',
                                        dateOfJoining: new Date(), // Set joining date to today (First Seen)
                                        shiftId: defaultShift?.id
                                    }
                                });
                            } catch (createErr) {
                                // Handle race condition where two logs come in at exact same millisecond
                                logger.warn(`ADMS Auto-Create Race Condition ignored for ${userId}: ${createErr}`);
                                employee = await prisma.employee.findFirst({
                                    where: { tenantId: device.tenantId, deviceUserId: userId }
                                });
                            }
                        }

                        try {
                            const uniqueId = `ADMS_${SN}_${userId}_${punchTime.getTime()}`;
                            await prisma.rawDeviceLog.upsert({
                                where: { id: uniqueId },
                                update: {
                                    // Optionally update if we get more info
                                    punchTime: punchTime,
                                },
                                create: {
                                    id: uniqueId,
                                    tenantId: device.tenantId,
                                    deviceId: device.id,
                                    userId: userId,
                                    deviceUserId: userId,
                                    userName: employee ? `${employee.firstName} ${employee.lastName}` : `Unknown ${userId}`,
                                    timestamp: punchTime,
                                    punchTime: punchTime,
                                    punchType: parts[2] || '0',
                                    isProcessed: false
                                }
                            });
                            count++;
                        } catch (e) {
                            logger.error(`ADMS Log Save Error (SN: ${SN}): ${e}`);
                        }
                    }
                }
            }

            // Handling OPERLOG (Machine Operations / User Info)
            if (table === 'OPERLOG') {
                // Format: OPERID  USERID  OPTYPE ...
                // This can be used to capture user registrations
            }
        }

        if (count > 0) {
            logger.info(`ADMS PUSH [${SN}]: Successfully saved ${count} logs. (Tenant: ${device.tenantId})`);
        }
    }

    // Critical: Response MUST be text/plain "OK" for ADMS machines
    res.set('Content-Type', 'text/plain');
    res.send('OK');
});

// 3. Command Queue / Heartbeat
// Machine pings this to see if there are any commands (LOG RECOVERY, REBOOT, etc.)
router.get('/getrequest', async (req, res) => {
    const { SN } = req.query;
    if (!SN) return res.send('OK');

    const device = await prisma.device.findFirst({
        where: { deviceId: SN as string }
    });

    if (!device) return res.send('OK');

    // Check for pending commands
    const command = await prisma.deviceCommand.findFirst({
        where: {
            deviceId: device.id,
            status: 'pending'
        },
        orderBy: { createdAt: 'asc' }
    });

    if (command) {
        // Mark as sent
        await prisma.deviceCommand.update({
            where: { id: command.id },
            data: { status: 'sent', sentAt: new Date() }
        });

        logger.info(`Sending command to ${SN}: ${command.command}`);
        return res.send(command.command);
    }

    res.send('OK');
});

// 4. Command Result
router.post('/devicecmd', async (req, res) => {
    const { SN } = req.query;
    const body = req.body;

    if (!SN) return res.send('OK');

    const device = await prisma.device.findFirst({
        where: { deviceId: SN as string }
    });

    if (!device) return res.send('OK');

    // ADMS sends command results in a specific format
    // ID=123&Return=0 (where 0 is usually success)
    if (typeof body === 'string') {
        const parts = body.split('&');
        let cmdId = '';
        let result = '';

        parts.forEach(p => {
            if (p.startsWith('ID=')) cmdId = p.split('=')[1];
            if (p.startsWith('Return=')) result = p.split('=')[1];
        });

        // Search for the command and update it
        // Since we use UUIDs and the device might send back a shorter ID, 
        // we usually just mark the latest 'sent' command as 'executed'
        const lastSentCommand = await prisma.deviceCommand.findFirst({
            where: { deviceId: device.id, status: 'sent' },
            orderBy: { sentAt: 'desc' }
        });

        if (lastSentCommand) {
            await prisma.deviceCommand.update({
                where: { id: lastSentCommand.id },
                data: {
                    status: result === '0' ? 'executed' : 'failed',
                    response: body
                }
            });
            logger.info(`Command ${lastSentCommand.id} on ${SN} result: ${result === '0' ? 'SUCCESS' : 'FAILED'}`);
        }
    }

    res.send('OK');
});

export default router;
