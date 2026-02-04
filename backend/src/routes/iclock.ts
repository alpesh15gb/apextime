import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';
import { DeviceCommandService } from '../services/deviceCommandService';

const router = express.Router();
const commandService = new DeviceCommandService();


/**
 * ADMS / iClock Protocol Handler
 * This allows biometric devices to PUSH data directly to the server.
 * Supports ESSL, Matrix (Direct), and Realtime (Direct) devices using the iClock protocol.
 */

// 1. Initial Handshake / Config Check
router.get(['/cdata*', '/:sn/cdata'], async (req, res) => {
    let SN = (req.params.sn as string) || (req.query.SN as string);
    const { options } = req.query;

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
router.post(['/cdata*', '/:sn/cdata'], async (req, res) => {
    let SN = (req.params.sn as string) || (req.query.SN as string) || (req.query.sn as string);
    let { table } = req.query;

    if (SN) {
        SN = SN.toString().trim();
    }

    // RealTime devices may send SN in POST body instead of query params
    if (!SN && req.body) {
        let bodyStr = '';

        // Handle different body types
        if (Buffer.isBuffer(req.body)) {
            // Check for RealTime Binary-JSON format (4 byte header + JSON)
            if (req.body.length > 4 && req.body[0] === 0x66) {
                const jsonPart = req.body.slice(4).toString('utf-8');
                try {
                    const data = JSON.parse(jsonPart);
                    console.log('--- REALTIME JSON DETECTED ---', data);

                    // Note: If SN is missing in JSON, we'll try to get it from headers or bodyStr below
                    if (data.SN) SN = data.SN;
                    if (data.deviceId) SN = data.deviceId;

                    // PARSE DATA FOR SAVING
                    if (data.user_id && data.io_time) {
                        const uId = data.user_id;
                        const rawTime = data.io_time;
                        const fmtTime = `${rawTime.substring(0, 4)}-${rawTime.substring(4, 6)}-${rawTime.substring(6, 8)} ${rawTime.substring(8, 10)}:${rawTime.substring(10, 12)}:${rawTime.substring(12, 14)}`;
                        const state = data.verify_mode || 1;
                        const type = data.io_mode || 0;

                        req.body = `${uId}\t${fmtTime}\t${state}\t${type}`;
                    }
                } catch (e) {
                    bodyStr = req.body.toString('utf-8');
                }
            } else {
                bodyStr = req.body.toString('utf-8');
            }
        } else if (typeof req.body === 'string') {
            bodyStr = req.body;
        } else if (typeof req.body === 'object') {
            bodyStr = JSON.stringify(req.body);
            if (req.body.SN) SN = req.body.SN;
            if (req.body.deviceId) SN = req.body.deviceId;
        }

        // Try to extract SN from body string via Regex
        if (!SN) {
            const snMatch = bodyStr.match(/SN=([^&\s\n\r]+)/i);
            if (snMatch) {
                SN = snMatch[1].trim();
                console.log('--- EXTRACTED SN FROM BODY: ' + SN + ' ---');
            }
        }
    }

    // If still no SN, check headers (some proxies/devices add it)
    if (!SN) {
        SN = (req.headers['x-device-sn'] as string) || (req.headers['sn'] as string);
    }

    if (SN) {
        console.log('--- INCOMING PUSH FROM SN: ' + SN + ' ---');
    } else {
        console.log('=== POST /cdata WITHOUT SN ===');
        console.log('Query params:', req.query);
        return res.send('OK');
    }

    const device = await prisma.device.findFirst({
        where: { deviceId: SN as string }
    });

    if (!device) {
        logger.warn(`PUSH: Data received from unknown device SN ${SN}`);
        return res.send('OK');
    }

    // Update status to online immediately on PUSH
    await prisma.device.update({
        where: { id: device.id },
        data: { status: 'online', lastSeen: new Date() }
    });

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
                    console.log('[ADMS DEBUG] Received:', parts[1], 'Parsed +05:30:', new Date(parts[1].replace(' ', 'T') + '+05:30'));
                    // Force IST Interpretation: Machine sends "YYYY-MM-DD HH:mm:ss"
                    // We treat this as explicit IST by appending the offset.
                    const punchTime = new Date(parts[1].replace(' ', 'T') + '+05:30');

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

                                // Default Shift (General Shift by Code 'GS')
                                const defaultShift = await prisma.shift.findFirst({
                                    where: { tenantId: device.tenantId, code: 'GS' }
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
                                        // type: 'FullTime', // Removed as it doesn't exist in schema
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

            // Handling USERINFO (User Data / Employee Names)
            if (table === 'USERINFO') {
                // Format: PIN=101\tName=John\t...
                const userData: any = {};
                parts.forEach(p => {
                    const [key, val] = p.split('=');
                    if (key && val) userData[key] = val;
                });

                if (userData.PIN) {
                    const userId = userData.PIN;
                    const name = userData.Name;
                    const card = userData.Card;

                    try {
                        const existingEmployee = await prisma.employee.findFirst({
                            where: { tenantId: device.tenantId, deviceUserId: userId }
                        });

                        if (existingEmployee) {
                            if (name && existingEmployee.firstName !== name) {
                                await prisma.employee.update({
                                    where: { id: existingEmployee.id },
                                    data: {
                                        firstName: name,
                                        lastName: '', // Clear placeholder
                                        cardNumber: card || existingEmployee.cardNumber
                                    }
                                });
                                logger.info(`ADMS User Sync: Updated Name for ${userId} to ${name}`);
                            }
                        } else {
                            const defaultShift = await prisma.shift.findFirst({
                                where: { tenantId: device.tenantId, code: 'GS' }
                            });

                            await prisma.employee.create({
                                data: {
                                    tenantId: device.tenantId,
                                    firstName: name || `Auto-User ${userId}`,
                                    lastName: name ? '' : '(Device)',
                                    employeeCode: userId,
                                    deviceUserId: userId,
                                    cardNumber: card,
                                    shiftId: defaultShift?.id,
                                    gender: 'Male',
                                    dateOfJoining: new Date()
                                }
                            });
                            logger.info(`ADMS User Sync: Created New User ${userId} (${name})`);
                        }
                        count++;
                    } catch (e) {
                        logger.error(`ADMS User Sync Error ${userId}: ${e}`);
                    }
                }
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
router.get('/getrequest*', async (req, res) => {
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
            status: 'PENDING'
        },
        orderBy: { createdAt: 'asc' }
    });

    if (command) {
        // Mark as sent
        await prisma.deviceCommand.update({
            where: { id: command.id },
            data: { status: 'SENT', sentAt: new Date() }
        });

        // Format the command properly for the device (e.g., C:ID:DATA QUERY ATTLOG...)
        const cmdStr = commandService.formatCommandForDevice(command);
        logger.info(`Sending command to ${SN}: ${cmdStr}`);
        return res.send(cmdStr);
    }

    res.send('OK');
});

// 4. Command Result
router.post('/devicecmd*', async (req, res) => {
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
