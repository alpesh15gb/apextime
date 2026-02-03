# RealTime Machine Configuration - CORRECTED

## CRITICAL: RealTime Uses HTTP (Like ESSL)

After reviewing the actual configuration, RealTime machines **DO use HTTP**, similar to ESSL's ADMS protocol.

## Current Problem

Your RealTime machine is configured to connect to:
```
http://82.112.236.81:80
```

This is **RealTime's cloud server in India**, not your Apextime server!

## Solution: Point Machine to Your Server

### Step 1: Access RealTime Machine Settings

1. On the RealTime device, go to: **System → Communication → Server Settings**

2. You'll see:
   ```
   Current Server: http://82.112.236.81:80
   ```

3. **Change to:**
   ```
   Server Address: http://95.98.2.20:5001/api/iclock/cdata
   ```
   
   OR if the machine only accepts IP and Port separately:
   ```
   Server IP: 95.98.2.20
   Server Port: 5001
   Protocol: HTTP
   Path: /api/iclock/cdata
   ```

### Step 2: Configure in Apextime Dashboard

1. Go to: **Attendance Devices → Add Device**

2. Fill in:
   ```
   Protocol: REALTIME_DIRECT (or ESSL_ADMS - both use same HTTP protocol)
   Device ID / Serial Number: RSS20230760881
   Name: RealTime Main Entrance
   Location: Main Building
   IP Address: (leave blank)
   Port: 5001
   ```

### Step 3: Verify Connection

After changing the server address on the machine:

```bash
cd /docker/apextime-saas

# Watch for incoming connections
docker-compose -f docker-compose.prod.yml logs -f backend | grep -E "INCOMING SN|RSS20230760881"
```

You should see:
```
--- INCOMING SN: RSS20230760881 ---
```

## Why It Wasn't Working

1. ❌ Machine was connecting to `82.112.236.81` (RealTime's cloud)
2. ❌ Your Apextime server at `95.98.2.20` was never contacted
3. ✅ Solution: Change machine config to point to YOUR server

## RealTime HTTP Protocol

RealTime machines use the **same ADMS/iClock protocol as ESSL**, which we already support!

The machine will:
1. Send GET request: `http://95.98.2.20:5001/api/iclock/cdata?SN=RSS20230760881&options=all`
2. Server responds with configuration
3. Machine sends POST with attendance logs
4. Server stores logs and marks device online

## Configuration Comparison

### ❌ WRONG (Current):
```
Server: http://82.112.236.81:80
Result: Data goes to RealTime cloud, not your server
```

### ✅ CORRECT (New):
```
Server: http://95.98.2.20:5001/api/iclock/cdata
Result: Data comes to YOUR Apextime server
```

## Testing Steps

### 1. Change Server Address on Machine
- Navigate to Communication settings
- Replace `82.112.236.81` with `95.98.2.20:5001`
- Save and restart device

### 2. Watch Server Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 3. Look for Connection
Within 30 seconds, you should see:
```
--- INCOMING SN: RSS20230760881 ---
```

### 4. Check Device Status in Dashboard
- Go to Attendance Devices
- Device status should change to "online"

## If Machine Doesn't Allow Full URL

Some RealTime machines have separate fields:

```
Server IP: 95.98.2.20
Server Port: 5001
Communication Path: /api/iclock/cdata
Upload Method: HTTP POST
```

## Alternative: Use Port 80

If the machine is hardcoded to use port 80, you can:

1. **Option A:** Add Nginx redirect on your server
   ```nginx
   server {
       listen 80;
       location /api/iclock/ {
           proxy_pass http://localhost:5001;
       }
   }
   ```

2. **Option B:** Change Apextime to listen on port 80
   - Edit `docker-compose.prod.yml`
   - Change `5001:5001` to `80:5001`
   - Restart: `docker-compose -f docker-compose.prod.yml up -d`

## Summary

**The issue is NOT the protocol** - RealTime uses standard HTTP ADMS (which we support).

**The issue IS the server address** - the machine is pointing to RealTime's cloud instead of your server.

**Fix:** Change the server address in the machine settings from `82.112.236.81` to `95.98.2.20:5001`

Once you change this, the machine will immediately start connecting to your Apextime server and appear online!
