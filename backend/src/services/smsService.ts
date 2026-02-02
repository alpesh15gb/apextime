
import fetch from 'node-fetch';
import logger from '../config/logger';

/**
 * SMS Service for Fast2SMS integration (DLT Route)
 * Sends notifications to employees when attendance or leaves are approved.
 * 
 * @param number - 10 digit mobile number
 * @param templateMessage - The exact message OR Template ID registered on DLT
 * @param variables - Pipe-separated values for {#var#} in DLT template (e.g. "John|Approved")
 */
export const sendSMS = async (number: string, templateMessage: string, variables: string = "") => {
    try {
        const apiKey = process.env.FAST2SMS_KEY;
        const senderId = process.env.SMS_SENDER_ID; // Must be set in .env

        if (!apiKey || !senderId) {
            logger.error('SMS Service: FAST2SMS_KEY or SMS_SENDER_ID not found in environment');
            return;
        }

        const cleanNumber = number.replace(/\D/g, '').slice(-10);
        if (cleanNumber.length !== 10) return;

        // DLT Route: https://www.fast2sms.com/dev/bulkV2
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=dlt&sender_id=${senderId}&message=${encodeURIComponent(templateMessage)}&variables_values=${encodeURIComponent(variables)}&flash=0&numbers=${cleanNumber}`;

        const response = await fetch(url);
        const result = await response.json() as any;

        if (result.return) {
            logger.info(`SMS (DLT) sent to ${cleanNumber}. Response: ${JSON.stringify(result.message)}`);
        } else {
            logger.error(`SMS (DLT) failed for ${cleanNumber}: ${result.message || JSON.stringify(result)}`);
        }
    } catch (error) {
        logger.error('SMS Service Error:', error);
    }
};
