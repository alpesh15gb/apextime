import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '../config/database';
import logger from '../config/logger';
import { Server } from 'http';

const router = express.Router();

// Store active WebSocket connections by device serial number
const activeConnections = new Map<string, WebSocket>();

/**
 * RealTime Biometric Device WebSocket Protocol Handler
 * 
 * RealTime devices use a proprietary WebSocket-based protocol where:
 * 1. Device connects via WebSocket
 * 2. Device sends heartbeat/status updates
 * 3. Device polls for commands
 * 4. Device pushes attendance logs in realtime
 * 
 * This is different from ESSL's HTTP-based ADMS protocol!
 */

export function initializeRealtimeWebSocket(server: Server) {
    const wss = new WebSocketServer({
        server,
        path: '/realtime-ws'
    });

    logger.info('RealTime WebSocket server initialized on /realtime-ws');

    wss.on('connection', (ws: WebSocket, req) => {
        logger.info(`RealTime device attempting connection from ${req.socket.remoteAddress}`);

        let deviceSerial: string | null = null;
        let deviceId: string | null = null;

        ws.on('message', async (data: Buffer) => {
            try {
                const message = data.toString('utf8');
                logger.info(`RealTime WS Message: ${message.substring(0, 200)}`);

                // Parse the message (RealTime uses custom protocol)
                const parsed = parseRealtimeMessage(message);

                if (!parsed) {
                    logger.warn('Failed to parse RealTime message');
                    return;
                }

                // Handle different message types
                switch (parsed.type) {
                    case 'DEVICE_STATUS':
                        // Device is sending heartbeat/status
                        deviceSerial = parsed.deviceId;

                        // Find device in our database
                        const device = await prisma.device.findFirst({
                            where: {
                                deviceId: deviceSerial,
                                protocol: 'REALTIME_DIRECT'
                            }
                        });

                        if (device) {
                            deviceId = device.id;
                            activeConnections.set(deviceSerial, ws);

                            // Update device status to online
                            await prisma.device.update({
                                where: { id: device.id },
                                data: {
                                    status: 'online',
                                    lastSeen: new Date()
                                }
                            });

                            logger.info(`RealTime device ${deviceSerial} connected and marked online`);

                            // Send acknowledgment
                            ws.send(JSON.stringify({
                                type: 'ACK',
                                status: 'OK'
                            }));
                        } else {
                            logger.warn(`Unknown RealTime device: ${deviceSerial}`);
                            ws.send(JSON.stringify({
                                type: 'ERROR',
                                message: 'Device not registered'
                            }));
                        }
                        break;

                    case 'ATTENDANCE_LOG':
                        // Device is sending attendance punch
                        if (!deviceSerial || !deviceId) {
                            logger.warn('Attendance log received before device identification');
                            return;
                        }

                        const { userId, timestamp, verifyMode, ioMode } = parsed.data;

                        // Store in DeviceLog
                        await prisma.deviceLog.create({
                            data: {
                                deviceId: deviceSerial,
                                userId: userId,
                                timestamp: new Date(timestamp),
                                rawData: message
                            }
                        });

                        logger.info(`Attendance log stored: ${userId} at ${timestamp}`);

                        // Send acknowledgment
                        ws.send(JSON.stringify({
                            type: 'ACK',
                            transId: parsed.transId
                        }));
                        break;

                    case 'COMMAND_REQUEST':
                        // Device is polling for commands
                        // TODO: Implement command queue system
                        ws.send(JSON.stringify({
                            type: 'NO_COMMAND'
                        }));
                        break;

                    default:
                        logger.warn(`Unknown RealTime message type: ${parsed.type}`);
                }

            } catch (error) {
                logger.error('Error processing RealTime WebSocket message:', error);
            }
        });

        ws.on('close', async () => {
            logger.info(`RealTime device ${deviceSerial} disconnected`);

            if (deviceSerial) {
                activeConnections.delete(deviceSerial);

                // Mark device as offline
                if (deviceId) {
                    await prisma.device.update({
                        where: { id: deviceId },
                        data: { status: 'offline' }
                    }).catch(err => logger.error('Error updating device status:', err));
                }
            }
        });

        ws.on('error', (error) => {
            logger.error(`RealTime WebSocket error for ${deviceSerial}:`, error);
        });
    });

    return wss;
}

/**
 * Parse RealTime proprietary message format
 * This is a simplified parser - you'll need to adjust based on actual protocol
 */
function parseRealtimeMessage(message: string): any {
    try {
        // Try JSON first
        const json = JSON.parse(message);
        return json;
    } catch {
        // If not JSON, parse custom format
        // RealTime might use tab-separated or custom format
        // Example: "STATUS\tRSS20230760881\t2024-01-01 12:00:00\tOK"

        const parts = message.split('\t');

        if (parts[0] === 'STATUS' && parts.length >= 2) {
            return {
                type: 'DEVICE_STATUS',
                deviceId: parts[1],
                timestamp: parts[2] || new Date().toISOString(),
                info: parts[3] || ''
            };
        }

        if (parts[0] === 'ATTLOG' && parts.length >= 5) {
            return {
                type: 'ATTENDANCE_LOG',
                transId: parts[1],
                data: {
                    userId: parts[2],
                    timestamp: parts[3],
                    verifyMode: parts[4],
                    ioMode: parts[5] || 'IN'
                }
            };
        }

        if (parts[0] === 'GETCMD') {
            return {
                type: 'COMMAND_REQUEST',
                deviceId: parts[1]
            };
        }

        return null;
    }
}

// HTTP endpoint to check RealTime device status
router.get('/status', async (req, res) => {
    const devices = await prisma.device.findMany({
        where: { protocol: 'REALTIME_DIRECT' },
        select: {
            id: true,
            name: true,
            deviceId: true,
            status: true,
            lastSeen: true
        }
    });

    const devicesWithConnection = devices.map(d => ({
        ...d,
        wsConnected: activeConnections.has(d.deviceId)
    }));

    res.json({
        success: true,
        devices: devicesWithConnection,
        activeConnections: activeConnections.size
    });
});

export default router;
