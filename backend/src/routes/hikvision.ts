import express from 'express';
import { prisma } from '../config/database';
import logger from '../config/logger';

const router = express.Router();

/**
 * Hikvision Direct Event Listener
 * Supports Hikvision devices (MinMoe / K1T series) pushing events via HTTP Host mode.
 * The machine sends XML or JSON when an event occurs.
 */

router.post('/event', async (req, res) => {
    try {
        // Log the incoming request for debugging (Hikvision can send multipart or raw JSON/XML)
        const eventData = req.body;
        const SN = req.headers['x-device-serial'] || eventData?.serialNo || eventData?.EventNotification?.serialNo;

        if (!SN) {
            // Some versions send it in the body, others in headers
            logger.warn('Hikvision event received without Serial Number');
            return res.status(200).send('OK');
        }

        const device = await prisma.device.findFirst({
            where: { serialNumber: SN as string }
        });

        if (!device) {
            logger.warn(`Unknown Hikvision SN: ${SN}`);
            return res.status(200).send('OK');
        }

        // Hikvision Event Mapping
        // Standard keys: employeeNo (String/Number), time (ISO Date)
        const userId = eventData?.employeeNo || eventData?.EventNotification?.employeeNo;
        const eventTime = eventData?.time || eventData?.EventNotification?.time;

        if (userId && eventTime) {
            const punchTime = new Date(eventTime);
            const uniqueId = `HIK_DIRECT_${SN}_${userId}_${punchTime.getTime()}`;

            await prisma.rawDeviceLog.upsert({
                where: { id: uniqueId },
                update: {},
                create: {
                    id: uniqueId,
                    tenantId: device.tenantId,
                    deviceId: device.id,
                    userId: userId.toString(),
                    punchTime: punchTime,
                    punchType: '0', // 0 = Generic match
                    isProcessed: false
                }
            });

            logger.info(`Hikvision Direct: Received log for User ${userId} from ${SN}`);
        }

        // Hikvision expects a 200 OK or a specific XML response
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Hikvision Event Handler Error:', error);
        res.status(200).send('OK'); // Always send OK to keep device from retrying excessively
    }
});

export default router;
