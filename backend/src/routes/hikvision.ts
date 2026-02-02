import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

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

router.post('/event', async (req, res) => {
    try {
        console.log(`[HIK_DIRECT] Incoming event from ${req.ip}`);
        // Log the incoming request for debugging (Hikvision can send multipart or raw JSON/XML)
        const eventData = req.body;
        const SN = req.headers['x-device-serial'] || req.headers['x-device-id'] || eventData?.serialNo || eventData?.EventNotification?.serialNo;

        if (!SN) {
            // Some versions send it in the body, others in headers
            logger.warn('Hikvision event received without Serial Number');
            return res.status(200).send('OK');
        }

        const device = await prisma.device.findFirst({
            where: { deviceId: SN as string }
        });

        if (!device) {
            logger.warn(`Unknown Hikvision SN: ${SN}`);
            return res.status(200).send('OK');
        }

        // Hikvision Event Mapping
        const userId = eventData?.employeeNo || eventData?.EventNotification?.employeeNo || eventData?.AccessControllerEvent?.employeeNoString;
        const eventTime = eventData?.time || eventData?.EventNotification?.time || eventData?.AccessControllerEvent?.dateTime;
        const userName = eventData?.name || eventData?.EventNotification?.name || eventData?.AccessControllerEvent?.name;

        if (userId && eventTime) {
            const punchTime = new Date(eventTime);
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
                    timestamp: punchTime,
                    punchTime: punchTime,
                    punchType: '0',
                    isProcessed: false
                }
            });

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
                    await prisma.employee.create({
                        data: {
                            tenantId: device.tenantId,
                            employeeCode: userIdStr,
                            firstName,
                            lastName,
                            deviceUserId: userIdStr,
                            isActive: true
                        }
                    });
                    logger.info(`Hikvision Direct: Created new employee ${userName} (ID: ${userIdStr})`);
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
