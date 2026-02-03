# RealTime Biometric Device Integration Guide

## IMPORTANT: RealTime ≠ ESSL

**RealTime** and **ESSL** are **COMPLETELY DIFFERENT** manufacturers with **DIFFERENT protocols**:

| Feature | ESSL/Matrix | RealTime |
|---------|-------------|----------|
| Protocol | HTTP-based ADMS/iClock | **WebSocket-based** |
| Connection | Device polls server via HTTP | **Persistent WebSocket connection** |
| Port | 5001 (HTTP) | **5001 (WebSocket)** |
| Endpoint | `/api/iclock/cdata` | **`ws://SERVER:5001/realtime-ws`** |
| Data Format | Tab-separated text | **Custom binary/JSON** |

## RealTime Device Configuration

### On the RealTime Machine:

1. **Navigate to:** System → Communication → Server Settings

2. **Configure:**
   ```
   Communication Mode: TCP/IP Client (WebSocket)
   Server IP: 95.98.2.20
   Server Port: 5001
   Device Serial: RSS20230760881
   Upload Mode: Realtime Push
   Heartbeat Interval: 30 seconds
   ```

3. **Save and Restart** the device

### In Apextime Dashboard:

1. Go to: **Attendance Devices** → **Add Device**

2. **Fill in:**
   ```
   Protocol: REALTIME_DIRECT
   Device ID / Serial Number: RSS20230760881
   Name: RealTime Main Entrance
   Location: Main Building
   IP Address: (leave blank - device connects to us)
   Port: (leave blank)
   ```

3. **Save**

## How RealTime Protocol Works

```
┌─────────────────┐                    ┌──────────────────┐
│  RealTime       │   WebSocket        │  Apextime        │
│  Device         │◄──────────────────►│  Server          │
│  RSS20230760881 │   Port 5001        │  95.98.2.20      │
└─────────────────┘                    └──────────────────┘
        │                                        │
        │  1. Connect ws://95.98.2.20:5001/realtime-ws
        │─────────────────────────────────────►│
        │                                        │
        │  2. Send STATUS message               │
        │  "STATUS\tRSS20230760881\t..."        │
        │─────────────────────────────────────►│
        │                                        │
        │  3. Server marks device ONLINE         │
        │◄─────────────────────────────────────│
        │  ACK                                   │
        │                                        │
        │  4. Send attendance log                │
        │  "ATTLOG\t123\t2024-01-01..."         │
        │─────────────────────────────────────►│
        │                                        │
        │  5. Server stores log                  │
        │◄─────────────────────────────────────│
        │  ACK                                   │
        │                                        │
        │  6. Poll for commands (every 30s)      │
        │  "GETCMD\tRSS20230760881"             │
        │─────────────────────────────────────►│
        │                                        │
        │◄─────────────────────────────────────│
        │  NO_COMMAND                            │
```

## Deployment Steps

### 1. Install Dependencies

```bash
cd /docker/apextime-saas
git pull origin master
cd backend
npm install ws @types/ws
cd ..
```

### 2. Rebuild Backend

```bash
docker-compose -f docker-compose.prod.yml up -d --build backend
```

### 3. Verify WebSocket Server Started

```bash
docker-compose -f docker-compose.prod.yml logs backend | grep "RealTime WebSocket"
```

You should see:
```
RealTime WebSocket server initialized on /realtime-ws
```

### 4. Test WebSocket Endpoint

```bash
# Install wscat if not already installed
npm install -g wscat

# Test connection
wscat -c ws://localhost:5001/realtime-ws
```

### 5. Configure Firewall

```bash
# WebSocket uses the same port as HTTP (5001)
# If you already have port 5001 open, you're good!
sudo ufw status
```

## Troubleshooting

### Device Not Connecting

**Check 1: WebSocket Server Running**
```bash
docker-compose -f docker-compose.prod.yml logs backend | tail -50
```

Look for: `RealTime WebSocket server initialized`

**Check 2: Device Can Reach Server**
From the device network, test:
```bash
ping 95.98.2.20
telnet 95.98.2.20 5001
```

**Check 3: Watch for Connection Attempts**
```bash
docker-compose -f docker-compose.prod.yml logs -f backend | grep "RealTime"
```

When device connects, you'll see:
```
RealTime device attempting connection from 192.168.x.x
RealTime device RSS20230760881 connected and marked online
```

### Device Connects But Shows Offline

**Check Serial Number Match:**
```bash
# Watch logs for the actual serial number
docker-compose -f docker-compose.prod.yml logs -f backend | grep "INCOMING\|RealTime device"
```

The serial number in logs MUST EXACTLY match what you entered in the dashboard.

### Attendance Logs Not Appearing

**Check 1: Device is Sending Logs**
```bash
docker-compose -f docker-compose.prod.yml logs -f backend | grep "ATTLOG\|Attendance log"
```

**Check 2: Database**
```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio
```

Navigate to `DeviceLog` table and check for recent entries with `deviceId = 'RSS20230760881'`

## RealTime vs ESSL - Quick Reference

### If You Have ESSL Device:
- Protocol: `ESSL_ADMS`
- Uses: HTTP polling
- Endpoint: `http://95.98.2.20:5001/api/iclock/cdata?SN=SERIAL`

### If You Have RealTime Device:
- Protocol: `REALTIME_DIRECT`
- Uses: WebSocket persistent connection
- Endpoint: `ws://95.98.2.20:5001/realtime-ws`

## Testing the Implementation

### 1. Manual WebSocket Test

```javascript
// test-realtime.js
const WebSocket = require('ws');

const ws = new WebSocket('ws://95.98.2.20:5001/realtime-ws');

ws.on('open', () => {
    console.log('Connected!');
    
    // Send status message
    ws.send('STATUS\tRSS20230760881\t2024-01-01 12:00:00\tOK');
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
});

ws.on('error', (error) => {
    console.error('Error:', error);
});
```

Run: `node test-realtime.js`

### 2. Check Device Status API

```bash
curl http://95.98.2.20:5001/api/realtime/status
```

Should return:
```json
{
  "success": true,
  "devices": [
    {
      "id": "...",
      "name": "RealTime Main Entrance",
      "deviceId": "RSS20230760881",
      "status": "online",
      "wsConnected": true
    }
  ],
  "activeConnections": 1
}
```

## Next Steps After Device is Online

1. **Test Attendance Punch:**
   - Have someone punch on the RealTime device
   - Check logs: `docker-compose -f docker-compose.prod.yml logs -f backend`
   - Should see: `Attendance log stored: [USER_ID] at [TIME]`

2. **Verify in Dashboard:**
   - Go to Attendance → Daily Logs
   - Check if the punch appears

3. **Monitor Connection:**
   - Device should send heartbeat every 30 seconds
   - If connection drops, device will auto-reconnect

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Device offline | Wrong protocol selected | Use `REALTIME_DIRECT`, not `ESSL_ADMS` |
| Connection refused | WebSocket not initialized | Rebuild backend, check logs |
| Serial mismatch | Typo in dashboard | Copy exact serial from device |
| Logs not storing | User ID not mapped | Check employee/student mapping |

## Support

If device still doesn't connect after following this guide:

1. Share the output of:
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend | grep -i realtime
   ```

2. Share the exact configuration from the RealTime device screen

3. Confirm the device model and firmware version
