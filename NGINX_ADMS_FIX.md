# Fix RealTime Machine Not Coming Online - Nginx Configuration

## Problem

Your RealTime machine is trying to connect to:
```
http://82.112.236.81:80/api/iclock/cdata?SN=RSS20230760881
```

But Nginx is NOT proxying these requests to your backend (port 5001), so the machine can't connect.

## Solution: Configure Nginx to Proxy ADMS Requests

### Step 1: Check Current Nginx Configuration

```bash
# On your VPS (82.112.236.81)
cd /etc/nginx/sites-available
ls -la

# Check if you have an apextime config
cat apextime 2>/dev/null || cat default
```

### Step 2: Create/Update Nginx Configuration

```bash
# Edit the Nginx config for your site
sudo nano /etc/nginx/sites-available/apextime
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name 82.112.236.81;
    
    # Increase timeouts for biometric devices
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    client_max_body_size 50M;

    # CRITICAL: ADMS protocol for biometric devices
    location /api/iclock/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
    }

    # All other API requests
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 3: Enable and Test Configuration

```bash
# If creating new file, enable it
sudo ln -s /etc/nginx/sites-available/apextime /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 4: Verify Backend is Running

```bash
# Check if backend is accessible on port 5001
curl http://localhost:5001/api/health

# Should return: {"status":"ok","version":"..."}
```

### Step 5: Test ADMS Endpoint

```bash
# Test the ADMS endpoint that the machine will hit
curl "http://localhost:80/api/iclock/cdata?SN=RSS20230760881"

# Should return: "OK" or configuration data
```

### Step 6: Watch for Machine Connection

```bash
cd /docker/apextime-saas

# Watch backend logs for incoming connection
docker-compose -f docker-compose.prod.yml logs -f backend | grep -E "INCOMING SN|RSS20230760881"
```

### Step 7: Configure RealTime Machine

On the RealTime device:
```
Server Address: http://82.112.236.81/api/iclock/cdata
OR
Server IP: 82.112.236.81
Server Port: 80
Upload Path: /api/iclock/cdata
```

## Troubleshooting

### Issue 1: Nginx Test Fails

```bash
# Check for syntax errors
sudo nginx -t

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Issue 2: Backend Not Responding

```bash
# Check if backend container is running
docker ps | grep backend

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend --tail=50

# Restart backend if needed
docker-compose -f docker-compose.prod.yml restart backend
```

### Issue 3: Port 5001 Not Accessible

```bash
# Check if backend is listening on 5001
netstat -tuln | grep 5001

# Check docker port mapping
docker ps | grep backend
```

### Issue 4: Firewall Blocking

```bash
# Check firewall status
sudo ufw status

# Ensure port 80 is open
sudo ufw allow 80/tcp

# Ensure internal port 5001 is accessible (should be by default)
```

## Quick Test Script

```bash
#!/bin/bash
echo "Testing Nginx → Backend connection..."

echo "1. Testing backend directly:"
curl -s http://localhost:5001/api/health && echo " ✓ Backend OK" || echo " ✗ Backend FAILED"

echo "2. Testing ADMS endpoint directly:"
curl -s "http://localhost:5001/api/iclock/cdata?SN=TEST" && echo " ✓ ADMS OK" || echo " ✗ ADMS FAILED"

echo "3. Testing through Nginx:"
curl -s "http://localhost:80/api/iclock/cdata?SN=TEST" && echo " ✓ Nginx Proxy OK" || echo " ✗ Nginx Proxy FAILED"

echo "4. Testing from external:"
curl -s "http://82.112.236.81/api/iclock/cdata?SN=TEST" && echo " ✓ External OK" || echo " ✗ External FAILED"
```

## Expected Flow

```
RealTime Machine
    ↓
http://82.112.236.81:80/api/iclock/cdata?SN=RSS20230760881
    ↓
Nginx (port 80)
    ↓
Proxy to http://localhost:5001/api/iclock/cdata?SN=RSS20230760881
    ↓
Backend Container (port 5001)
    ↓
Device marked ONLINE in database
```

## Verification Checklist

- [ ] Nginx configuration includes `/api/iclock/` location block
- [ ] Nginx test passes: `sudo nginx -t`
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Backend responding: `curl http://localhost:5001/api/health`
- [ ] ADMS endpoint works: `curl http://localhost:80/api/iclock/cdata?SN=TEST`
- [ ] Machine configured with: `http://82.112.236.81/api/iclock/cdata`
- [ ] Backend logs show: `--- INCOMING SN: RSS20230760881 ---`
- [ ] Device shows ONLINE in dashboard

## Common Mistakes

1. ❌ Forgot to reload Nginx after config change
2. ❌ Backend not running or not on port 5001
3. ❌ Firewall blocking port 80
4. ❌ Machine configured with wrong URL (missing `/api/iclock/cdata`)
5. ❌ Serial number mismatch in dashboard vs machine

## Next Steps

After Nginx is configured:

1. The machine should connect within 30 seconds
2. Check backend logs for `INCOMING SN`
3. Device status will change to "online" in dashboard
4. Attendance punches will start appearing automatically

If you still don't see the connection, share:
- Output of `sudo nginx -t`
- Output of `curl http://localhost:80/api/iclock/cdata?SN=TEST`
- Backend logs: `docker-compose logs backend --tail=100`
