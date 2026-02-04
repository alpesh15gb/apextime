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

        if (!SN) {
            logger.warn('Hikvision event received without Serial Number');
            return res.status(200).send('OK');
        }

        const snStr = SN.toString();

        const device = await prisma.device.findFirst({
            where: {
                deviceId: {
                    equals: snStr,
                    mode: 'insensitive'
                }
            }
        });

        if (!device) {
            logger.warn(`Unknown Hikvision SN: ${SN}`);
            return res.status(200).send('OK');
        }

        // Update Device Status as Online
        await prisma.device.update({
            where: { id: device.id },
            data: { status: 'online', lastSeen: new Date() }
        });

        // Hikvision Event Mapping (support all formats)
        const userId = eventData?.employeeNo || eventData?.EventNotification?.employeeNo || eventData?.AccessControllerEvent?.employeeNoString || eventData?.AccessControllerEvent?.employeeNo;
        const eventTime = eventData?.time || eventData?.EventNotification?.time || eventData?.AccessControllerEvent?.dateTime || eventData?.dateTime;
        const userName = eventData?.name || eventData?.EventNotification?.name || eventData?.AccessControllerEvent?.name;

        if (userId && eventTime) {
            // Strict IST Parsing: Hikvision sends "YYYY-MM-DDTHH:mm:ss" or similar
            const punchTime = new Date(eventTime.toString().replace('Z', ''));
            const userIdStr = userId.toString();
            const uniqueId = `HIK_DIRECT_${SN}_${userIdStr}_${punchTime.getTime()}`;

            await prisma.rawDeviceLog.upsert({
                where: { id: uniqueId },
                update: {},
                create: {
                    id: uniqueId,
                    tenantId: device.tenantId,
                    deviceId: device.id,
                    userId: userIdStr,
                    deviceUserId: userIdStr,
                    userName: userName,
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: '0',
                    isProcessed: false
                }
            });

            // Demo/Real-time Fix: Trigger attendance calculation immediately IF the log is fresh (< 24h old)
            const isFresh = (new Date().getTime() - punchTime.getTime()) < (24 * 60 * 60 * 1000);
            if (isFresh) {
                try {
                    await processAttendanceLogs([{
                        DeviceLogId: 0,
                        DeviceId: SN.toString(),
                        UserId: userIdStr,
                        LogDate: punchTime
                    }]);
                } catch (procErr) {
                    logger.error(`Real-time processing failed for ${userIdStr}:`, procErr);
                }
            }

            // Auto-create/update employee if name is available and employee doesn't have a real name yet
            if (userName && !/^\d+$/.test(userName)) {
                const existingEmployee = await prisma.employee.findFirst({
                    where: { tenantId: device.tenantId, deviceUserId: userIdStr }
                });

                const nameParts = userName.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || '';

                if (existingEmployee) {
                    if (existingEmployee.firstName === 'Employee' || /^\d+$/.test(existingEmployee.firstName)) {
                        await prisma.employee.update({
                            where: { id: existingEmployee.id },
                            data: { firstName, lastName }
                        });
                        logger.info(`Hikvision Direct: Updated name for ${userIdStr} to ${userName}`);
                    }
                } else {
                    // Default Shift (General Shift by Code 'GS')
                    const defaultShift = await prisma.shift.findFirst({
                        where: { tenantId: device.tenantId, code: 'GS' }
                    });

                    await prisma.employee.create({
                        data: {
                            tenantId: device.tenantId,
                            employeeCode: userIdStr,
                            firstName,
                            lastName,
                            deviceUserId: userIdStr,
                            isActive: true,
                            shiftId: defaultShift?.id
                        }
                    });
                    logger.info(`Hikvision Direct: Created new employee ${userName} (ID: ${userIdStr}) with GS Shift`);
                }
            }

            logger.info(`Hikvision Direct: Received log for User ${userIdStr} from ${SN}`);
        }

        // Hikvision expects a 200 OK or a specific XML response
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Hikvision Event Handler Error:', error);
        res.status(200).send('OK'); // Always send OK to keep device from retrying excessively
    }
});

export default router;
