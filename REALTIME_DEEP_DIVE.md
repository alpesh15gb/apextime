# DEEP DIVE: RealTime Protocol Analysis

## Critical Discovery

Based on the proprietary software analysis, RealTime uses a **hybrid protocol**:

1. **FK Server (WebSocket-based)**: For command/control via stored procedures
2. **RT Series API (HTTP-based)**: For simple data collection

The **yellow triangle** indicates the machine is in "**partial connection**" mode.

## What We Need RIGHT NOW

Run these commands on your VPS and share the EXACT output:

### 1. Check What the Machine is Actually Requesting

```bash
cd /docker/apextime-saas

# Enable detailed request logging
docker-compose -f docker-compose.prod.yml exec backend sh -c '
cat > /tmp/log-requests.js << "EOF"
const express = require("express");
const app = express();
app.use(express.raw({ type: "*/*" }));

app.all("*", (req, res) => {
  const log = {
    time: new Date().toISOString(),
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body ? req.body.toString() : null
  };
  console.log("=== REQUEST ===");
  console.log(JSON.stringify(log, null, 2));
  console.log("===============");
  
  // Send OK response
  res.send("OK");
});

app.listen(9000, () => console.log("Logging server on 9000"));
EOF
node /tmp/log-requests.js &
'

# Now watch ALL requests
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. While Logs are Running

**On the RealTime machine:**
- Go to Communication Settings
- Trigger a manual connection test
- Watch what appears in the logs

### 3. Check Current Backend Logs for ANY Request from the Machine

```bash
# Search for requests from the machine's IP
docker-compose -f docker-compose.prod.yml logs backend | grep -i "GET\|POST" | tail -50
```

## The Real Issue

The yellow triangle means:
- ✅ Machine reaches the server
- ✅ Server responds
- ❌ **Server doesn't call the stored procedure to mark device as "connected=1"**

The proprietary software has:
- `usp_update_device_conn_status` - Updates device status to connected
- `usp_receive_cmd` - Polls for commands
- `usp_set_cmd_result` - Sends command results

Our `/api/iclock/cdata` endpoint updates our Prisma database, but the machine expects a **specific response format** that confirms the stored procedure was called successfully.

## Possible Solutions

### Solution 1: Match the Exact Response Format

The machine might expect a specific response when it connects. Try modifying the iclock endpoint:

```typescript
// Instead of just "OK", try:
res.send("GET OPTION FROM: " + SN + "\nStamp=9999\nRealtime=1");
```

### Solution 2: The Machine Needs Device Registration First

Check if the device needs to be "registered" in a specific table first. The proprietary software has `tbl_fkdevice_status` which tracks registration.

### Solution 3: Different Endpoint

The machine might not be using `/api/iclock/cdata` at all. It might be using:
- `/Default.aspx`
- `/Default2.aspx`  
- `/UpdateDevice.aspx`
- A WebSocket endpoint

## IMMEDIATE ACTION REQUIRED

**Share the output of this command:**

```bash
cd /docker/apextime-saas
docker-compose -f docker-compose.prod.yml logs backend | grep -E "GET|POST|INCOMING" | tail -100
```

This will show us:
1. What endpoint the machine is hitting
2. What parameters it's sending
3. Whether it's even reaching our backend

**Also check the RealTime machine settings:**
- What is the EXACT server URL configured?
- Is there a "Test Connection" button? What does it say?
- Are there any error messages or status codes shown?

The yellow triangle is telling us something specific - we just need to see what the machine is actually asking for!
