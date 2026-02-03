# RealTime Biometric Machine Connection Guide

## Problem: Machine Not Showing Online

### Configuration Requirements:

1. **On the RealTime Machine:**
   - Server IP: Your VPS IP (e.g., 95.98.2.20)
   - Server Port: **5001** (NOT 7799 - that's for their proprietary software)
   - Communication Mode: **ADMS / Push Mode**
   - Serial Number: Must match exactly in both places

2. **In Your Apextime Dashboard:**
   - Go to: Attendance Devices → Add Device
   - Protocol: Select **"REALTIME_DIRECT"** or **"ESSL_ADMS"**
   - Device ID / Serial Number: Enter the EXACT serial number from the machine
   - IP Address: Leave blank (machine pushes to us)
   - Port: 5001

### Connection Flow:
```
RealTime Machine → http://YOUR_VPS_IP:5001/api/iclock/cdata?SN=SERIAL_NUMBER
```

### Troubleshooting Steps:

#### Step 1: Verify Backend is Listening
```bash
cd /docker/apextime-saas
docker-compose -f docker-compose.prod.yml logs -f backend | grep "iclock"
```

#### Step 2: Check if Machine is Reaching Server
```bash
# Watch for incoming connections
docker-compose -f docker-compose.prod.yml logs -f backend | grep "INCOMING SN"
```

#### Step 3: Verify Firewall
```bash
# Ensure port 5001 is open
sudo ufw status
sudo ufw allow 5001/tcp
```

#### Step 4: Test the Endpoint Manually
```bash
# From another machine, test if the endpoint responds
curl "http://YOUR_VPS_IP:5001/api/iclock/cdata?SN=TEST123"
```

### Common Issues:

1. **Serial Number Mismatch**
   - Machine shows: `ABC123`
   - Dashboard has: `abc123` ❌
   - **Solution:** Must match EXACTLY (case-sensitive)

2. **Wrong Port**
   - Machine configured with: 7799 ❌
   - Should be: 5001 ✅

3. **Wrong Protocol**
   - If you selected "SQL_MIRROR" or "SQL_LOGS" ❌
   - Should be: "REALTIME_DIRECT" or "ESSL_ADMS" ✅

4. **Firewall Blocking**
   - VPS firewall blocking port 5001
   - **Solution:** `sudo ufw allow 5001/tcp`

5. **Machine Not in Push Mode**
   - Some machines need to be set to "ADMS" or "Push" mode
   - Check machine's communication settings

### Expected Behavior When Working:

1. Machine sends heartbeat every 30 seconds to `/api/iclock/cdata?SN=XXXXX`
2. Backend logs show: `--- INCOMING SN: XXXXX ---`
3. Device status changes to "online" in dashboard
4. Attendance logs start appearing automatically

### Debug Commands:

```bash
# 1. Check if backend is running
docker-compose -f docker-compose.prod.yml ps

# 2. Watch live logs
docker-compose -f docker-compose.prod.yml logs -f backend

# 3. Check device table in database
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio
# Navigate to "Device" table and verify serial number

# 4. Test endpoint accessibility
curl -v "http://localhost:5001/api/iclock/cdata?SN=TEST"
```

### Machine Configuration (RealTime Device):

**Menu Path:** System → Communication → Server Settings

- **Server Type:** ADMS / HTTP Push
- **Server IP:** 95.98.2.20 (your VPS)
- **Server Port:** 5001
- **Upload Interval:** 30 seconds
- **Realtime Upload:** Enabled

### If Still Not Working:

1. **Check the exact serial number on the machine:**
   - Usually found in: System → Device Info → Serial Number
   - Copy it EXACTLY (including any dashes or special characters)

2. **Verify the machine can reach your server:**
   - From the machine's network, try: `ping 95.98.2.20`
   - If ping fails, there's a network issue

3. **Check backend logs for errors:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend | grep -i error
   ```

4. **Temporarily disable SSL/encryption on the machine**
   - Some machines have SSL settings that can cause issues
   - Set "Encrypt" to 0 or "None"

### Next Steps:

After configuring the machine:
1. Wait 30-60 seconds
2. Check backend logs for `INCOMING SN`
3. Refresh the Devices page in dashboard
4. Status should change from "offline" to "online"

If you see the serial number in logs but device stays offline, there might be a mismatch in the database. Share the exact serial number you see in logs and I'll help you fix it.
