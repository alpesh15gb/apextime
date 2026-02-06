import express from 'express';
import { prisma } from '../config/database';
import multer from 'multer';
import logger from '../config/logger';
import { processAttendanceLogs } from '../services/logSyncService';

const router = express.Router();
const upload = multer();

/**
 * Hikvision Direct Event Listener
 * Supports Hikvision devices (MinMoe / K1T series) pushing events via HTTP Host mode.
 * The machine sends XML or JSON when an event occurs.
 */

router.get('/event', async (req, res) => {
    if (req.query.test === '1') {
        try {
            const device = await prisma.device.findFirst({
                where: { protocol: 'HIKVISION_DIRECT' }
            });

            if (!device) {
                return res.send('Hikvision Listener is Active, but no HIKVISION_DIRECT device is registered in Apextime. Please add a device with its Serial Number first.');
            }

            const userIdStr = 'TEST999';
            const uniqueId = `HIK_TEST_${Date.now()}`;

            await prisma.rawDeviceLog.create({
                data: {
                    id: uniqueId,
                    tenantId: device.tenantId,
                    deviceId: device.id,
                    userId: userIdStr,
                    deviceUserId: userIdStr,
                    timestamp: new Date(),
                    punchTime: new Date(),
                    punchType: '0',
                    isProcessed: false
                }
            });

            return res.send(`SUCCESS: Simulated punch for Device ${device.deviceId} was saved to the database! Please check your Dashboard for User TEST999.`);
        } catch (err) {
            return res.send(`ERROR during simulation: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
    res.status(200).send('Hikvision Event Listener is Active. To test your connection, visit: /api/hikvision/event?test=1');
});

router.post('/event', upload.any(), async (req, res) => {
    try {
        console.log(`[HIK_DIRECT] Incoming event from ${req.ip}`);
        console.log('HIK_HEADERS:', JSON.stringify(req.headers));

        let eventData = req.body;

        // If it's multipart, Hikvision often puts the JSON in 'event_log' or 'EventNotificationAlert'
        if (req.body && req.body.event_log) {
            try {
                eventData = JSON.parse(req.body.event_log);
                console.log('HIK_MULTIPART_JSON:', JSON.stringify(eventData).substring(0, 500));
            } catch (e) {
                // If not JSON, might be XML
                eventData = req.body.event_log;
            }
        }

        // If it's a string (likely XML or unparsed JSON from body or event_log)
        if (typeof eventData === 'string') {
            console.log('HIK_RAW_BODY:', eventData.substring(0, 500));
            // Basic XML extraction via Regex (Avoids adding new deps)
            const snMatch = eventData.match(/<serialNo>(.*?)<\/serialNo>/i);
            const employeeNoMatch = eventData.match(/<employeeNo>(.*?)<\/employeeNo>/i);
            const timeMatch = eventData.match(/<dateTime>(.*?)<\/dateTime>/i) || eventData.match(/<time>(.*?)<\/time>/i);
            const nameMatch = eventData.match(/<name>(.*?)<\/name>/i);

            if (snMatch) {
                // Synthesize an object that the rest of the code expects
                eventData = {
                    serialNo: snMatch[1],
                    employeeNo: employeeNoMatch ? employeeNoMatch[1] : undefined,
                    time: timeMatch ? timeMatch[1] : undefined,
                    name: nameMatch ? nameMatch[1] : undefined
                };
            } else {
                // Try JSON parsing if it looks like JSON but came as string
                try {
                    if (eventData.trim().startsWith('{')) {
                        eventData = JSON.parse(eventData);
                    }
                } catch (e) { }
            }
        } else {
            console.log('HIK_JSON_BODY:', JSON.stringify(eventData).substring(0, 500));
        }

        let SN = req.headers['x-device-serial'] ||
            req.headers['x-device-id'] ||
            req.headers['mac'] ||
            eventData?.deviceID ||
            eventData?.macAddress ||
            eventData?.serialNo ||
            eventData?.EventNotification?.serialNo ||
            eventData?.AccessControllerEvent?.serialNo;

        // 1. EXTRACT SUB-EVENT TYPE FIRST
        const subType = eventData?.AccessControllerEvent?.subEventType ||
            eventData?.EventNotification?.subEventType ||
            eventData?.subEventType;

        // ONLY process '75' (Verification Success). Ignore door sensors 21, 22, etc.
        if (subType && subType !== 75 && subType !== '75') {
            return res.status(200).send('OK');
        }



        if (!SN) {
            return res.status(200).send('OK');
        }

        const snStr = SN.toString();

        // 2. FETCH DEVICE (Cached ideally, but findFirst is okay if filtered)
        const device = await prisma.device.findFirst({
            where: { deviceId: { equals: snStr, mode: 'insensitive' } }
        });

        if (!device) return res.status(200).send('OK');

        // Throttled LastSeen update
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!device.lastSeen || device.lastSeen < fiveMinsAgo) {
            prisma.device.update({
                where: { id: device.id },
                data: { status: 'online', lastSeen: new Date() }
            }).catch(() => { }); // Fire and forget
        }

        // 3. EXTRACT USER DATA
        const userId = eventData?.employeeNo ||
            eventData?.EventNotification?.employeeNo ||
            eventData?.AccessControllerEvent?.employeeNoString ||
            eventData?.AccessControllerEvent?.employeeNo;

        const eventTime = eventData?.time ||
            eventData?.EventNotification?.time ||
            eventData?.AccessControllerEvent?.dateTime ||
            eventData?.dateTime;

        const userName = eventData?.name ||
            eventData?.EventNotification?.name ||
            eventData?.AccessControllerEvent?.name;

        if (userId && eventTime) {
            // Hikvision MinMoe/K1T devices send local time (IST) with a 'Z' suffix.
            // This is a known Hikvision firmware quirk — the Z does NOT mean UTC.
            // We strip it so JS parses the timestamp as local IST (which it actually is).
            const rawTime = eventTime.toString();
            const punchTime = new Date(rawTime.replace('Z', ''));
            if (isNaN(punchTime.getTime())) {
                logger.warn(`Hikvision: Invalid event time received: ${rawTime}`);
                return res.status(200).send('OK');
            }
            const userIdStr = userId.toString();
            const uniqueId = `HIK_DIRECT_${SN}_${userIdStr}_${punchTime.getTime()}`;

            // 1. SAVE RAW LOG
            let rawLog;
            try {
                rawLog = await prisma.rawDeviceLog.upsert({
                    where: { id: uniqueId },
                    update: { isProcessed: false }, // Force reprocessing if it hits again
                    create: {
                        id: uniqueId,
                        tenantId: device.tenantId,
                        deviceId: device.id,
                        userId: userIdStr,
                        deviceUserId: userIdStr,
                        userName: userName || 'HIK_DIRECT',
                        timestamp: punchTime,
                        punchTime: punchTime,
                        punchType: '0',
                        isProcessed: false
                    }
                });
            } catch (e) {
                // Ignore duplicate errors
            }

            // 2. REAL-TIME PROCESSING (Now that sync is done, we want names & stats instantly)
            try {
                // Find or Create Employee
                let employee = await prisma.employee.findFirst({
                    where: {
                        tenantId: device.tenantId,
                        deviceUserId: userIdStr
                    }
                });

                if (!employee) {
                    // Auto-create if not found
                    employee = await prisma.employee.create({
                        data: {
                            tenantId: device.tenantId,
                            deviceUserId: userIdStr,
                            employeeCode: userIdStr,
                            firstName: userName || userIdStr,
                            lastName: '',
                            status: 'ACTIVE'
                        }
                    });
                    logger.info(`Auto-created employee ${employee.employeeCode} for Hikvision punch`);
                } else if (userName && (employee.firstName === userIdStr || employee.firstName === 'Employee')) {
                    // Update name if we have a better one now
                    await prisma.employee.update({
                        where: { id: employee.id },
                        data: { firstName: userName }
                    });
                }

                // 3. Mark processed if it's for today (Real-time update) - NON-BLOCKING
                const isToday = new Date().toDateString() === punchTime.toDateString();
                if (isToday) {
                    // Start processing in background, do NOT await it here.
                    // This prevents 502 Bad Gateway by responding to the device immediately.
                    processAttendanceLogs([{
                        DeviceLogId: Date.now(),
                        DeviceId: SN.toString(),
                        UserId: userIdStr,
                        LogDate: punchTime,
                        TableName: 'HIK_DIRECT'
                    }]).then(async () => {
                        await prisma.rawDeviceLog.update({
                            where: { id: uniqueId },
                            data: { isProcessed: true }
                        });
                    }).catch(err => {
                        logger.error(`Background attendance processing failed for ${userIdStr}:`, err);
                    });
                }
            } catch (procErr) {
                logger.error(`Hikvision Real-time processing error for ${userIdStr}:`, procErr);
            }

            logger.info(`Hikvision Punch Received: ${userIdStr} (${userName || 'Unknown'}) at ${punchTime.toISOString()}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error('Hikvision Event Handler Error:', error);
        res.status(200).send('OK');
    }
});

router.post('/event/batch', async (req, res) => {
    const { punches, agentName } = req.body;

    if (!punches || !Array.isArray(punches)) {
        return res.status(400).send('Invalid punches data');
    }

    logger.info(`Received batch of ${punches.length} punches from agent: ${agentName}`);

    for (const p of punches) {
        try {
            const { sn, userId, userName, punchTime: pTimeStr } = p;
            const punchTime = new Date(pTimeStr);
            const userIdStr = userId.toString();
            const uniqueId = `HIK_AGENT_${sn}_${userIdStr}_${punchTime.getTime()}`;

            const device = await prisma.device.findFirst({
                where: { deviceId: { equals: sn, mode: 'insensitive' } }
            });

            if (!device) continue;

            // 1. Save Raw Log
            await prisma.rawDeviceLog.upsert({
                where: { id: uniqueId },
                update: {},
                create: {
                    id: uniqueId,
                    tenantId: device.tenantId,
                    deviceId: device.id,
                    userId: userIdStr,
                    deviceUserId: userIdStr,
                    userName: userName || 'HIK_OFFLINE',
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: '0',
                    isProcessed: false
                }
            });

            // 2. Process Employee and Attendance (Background)
            let employee = await prisma.employee.findFirst({
                where: { tenantId: device.tenantId, deviceUserId: userIdStr }
            });

            if (!employee) {
                employee = await prisma.employee.create({
                    data: {
                        tenantId: device.tenantId,
                        deviceUserId: userIdStr,
                        employeeCode: userIdStr,
                        firstName: userName || userIdStr,
                        lastName: '',
                        status: 'ACTIVE'
                    }
                });
            }

            // Trigger calc
            processAttendanceLogs([{
                DeviceLogId: Date.now(),
                DeviceId: sn,
                UserId: userIdStr,
                LogDate: punchTime,
                TableName: 'HIK_AGENT'
            }]).then(async () => {
                await prisma.rawDeviceLog.update({
                    where: { id: uniqueId },
                    data: { isProcessed: true }
                });
            }).catch(() => { });

        } catch (err) {
            logger.error('Error processing batch punch item:', err);
        }
    }

    res.status(200).send('OK');
});

export default router;

