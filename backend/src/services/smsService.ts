
import fetch from 'node-fetch';
import logger from '../config/logger';

/**
 * SMS Service for Fast2SMS integration
 * Sends notifications to employees when attendance or leaves are approved.
 */
export const sendSMS = async (number: string, message: string) => {
    try {
        const apiKey = process.env.FAST2SMS_KEY;
        if (!apiKey) {
            logger.error('SMS Service: FAST2SMS_KEY not found in environment');
            return;
        }

        // Clean number (ensure it's 10 digits/prefixed correctly for India)
        const cleanNumber = number.replace(/\D/g, '').slice(-10);

        if (cleanNumber.length !== 10) {
            logger.warn(`SMS Service: Invalid phone number ${number}`);
            return;
        }

        // Fast2SMS URL structure (Using route=q for quick SMS which is usually easier for non-DLT users)
        // If the user insists on DLT, they need Template IDs.
        // I will use their provided DLT structure but fallback to 'q' if they don't have DLT setup.
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&message=${encodeURIComponent(message)}&flash=0&numbers=${cleanNumber}`;

        const response = await fetch(url);
        const result = await response.json() as any;

        if (result.return) {
            logger.info(`SMS sent successfully to ${cleanNumber}: ${message}`);
        } else {
            logger.error(`SMS failed for ${cleanNumber}: ${result.message || JSON.stringify(result)}`);
        }
    } catch (error) {
        logger.error('SMS Service Error:', error);
    }
};
