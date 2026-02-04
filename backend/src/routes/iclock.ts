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
router.get('/cdata*', async (req, res) => {
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
router.post('/cdata*', async (req, res) => {
    let { SN, table } = req.query;

    // RealTime devices may send SN in POST body instead of query params
    // Try to extract SN from body if not in query
    // RealTime devices may send SN in POST body instead of query params
    // Try to extract SN from body if not in query
    if (!SN && req.body) {
        let bodyStr = '';

        // Handle different body types
        if (Buffer.isBuffer(req.body)) {
            // Check for RealTime Binary-JSON format (4 byte header + JSON)
            // Header often starts with 0x66 (f)
            if (req.body.length > 4 && req.body[0] === 0x66) { // 0x66 is 'f'
                const jsonPart = req.body.slice(4).toString('utf-8');
                try {
                    const data = JSON.parse(jsonPart);
                    console.log('--- REALTIME JSON DETECTED ---', data);

                    // REALTIME HACK: The packet often lacks SN, but we know the device IP maps to this one.
                    // Use the hardcoded SN provided by user if missing.
                    // TODO: In future, map IP to SN dynamically.
                    if (!SN) {
                        SN = 'RSS20230760881';
                        console.log('--- FORCING SN FOR REALTIME DEVICE: ' + SN + ' ---');
                    }

                    // PARSE DATA FOR SAVING
                    // Format: {"user_id":"00000010","io_time":"20260204040113", ...}
                    if (data.user_id && data.io_time) {
                        const uId = data.user_id;
                        const rawTime = data.io_time; // YYYYMMDDHHmmss
                        // Convert to YYYY-MM-DD HH:mm:ss for standard ADMS parser
                        const fmtTime = `${rawTime.substring(0, 4)}-${rawTime.substring(4, 6)}-${rawTime.substring(6, 8)} ${rawTime.substring(8, 10)}:${rawTime.substring(10, 12)}:${rawTime.substring(12, 14)}`;

                        // Construct ADMS-like tab-separated line: UserID  Time  State  PunchType
                        // State/Type: 1/1? Standard ADMS CheckIn=0. Let's send 1 for now.
                        const state = data.verify_mode || 1;
                        const type = data.io_mode || 0;

                        // Overwrite req.body with standard text format so downstream logic saves it
                        req.body = `${uId}\t${fmtTime}\t${state}\t${type}`;
                        console.log('--- CONVERTED REALTIME JSON TO ADMS FORMAT:', req.body, '---');
                    }
                } catch (e) {
                    console.log('--- REALTIME JSON PARSE ERROR ---', e);
                    // Fallback to normal string conversion
                    bodyStr = req.body.toString('utf-8');
                }
            } else {
                bodyStr = req.body.toString('utf-8');
            }
            console.log('--- BUFFER BODY DETECTED, length:', req.body.length, '---');
        } else if (typeof req.body === 'string') {
            bodyStr = req.body;
        } else if (typeof req.body === 'object') {
            bodyStr = JSON.stringify(req.body);
        }

        // Try to extract SN from body string (if we haven't found it yet)
        if (!SN) {
            const snMatch = bodyStr.match(/SN=([^&\s\n\r]+)/);
            if (snMatch) {
                SN = snMatch[1];
                console.log('--- EXTRACTED SN FROM BODY: ' + SN + ' ---');
            }
        }
    }

    // DEBUG: Print incoming SN so user can match it in dashboard
    if (SN) {
        console.log('--- INCOMING SN: ' + SN + ' ---');
    }

    // DEBUG: Log all query parameters and body to see what device is sending
    if (!SN) {
        console.log('=== POST /cdata WITHOUT SN ===');
        console.log('Query params:', req.query);
        console.log('URL:', req.url);
        console.log('Body type:', typeof req.body, Buffer.isBuffer(req.body) ? '(Buffer)' : '');

        if (Buffer.isBuffer(req.body)) {
            console.log('Body length:', req.body.length);
            console.log('Body preview (hex):', req.body.slice(0, 100).toString('hex'));
            console.log('Body preview (utf8):', req.body.slice(0, 300).toString('utf-8'));
        } else {
            console.log('Body preview:', typeof req.body === 'string' ? req.body.substring(0, 300) : JSON.stringify(req.body).substring(0, 300));
        }

        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('==============================');
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

        logger.info(`Sending command to ${SN}: ${command.commandType}`);
        return res.send(command.commandType);
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
