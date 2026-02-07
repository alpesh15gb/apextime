#!/bin/bash
# Final Deep Dive Diagnosis

echo "=== 1. Verify Active Nginx Config on Disk ==="
echo "Path: /etc/nginx/sites-enabled/pewec.apextime.in"
cat /etc/nginx/sites-enabled/pewec.apextime.in | grep "proxy_pass"

echo ""
echo "=== 2. Check Host Nginx Error Log (Last 20 lines) ==="
# Try multiple common locations
if [ -f "/var/log/nginx/error.log" ]; then
    sudo tail -n 20 /var/log/nginx/error.log
elif [ -f "/var/log/nginx/error.log.1" ]; then
     sudo tail -n 20 /var/log/nginx/error.log.1
else
    echo "Could not find standard error log. Checking journal..."
    sudo journalctl -u nginx --no-pager -n 20
fi

echo ""
echo "=== 3. Simulate Request via Host Nginx (Port 80) ==="
# We send a request to localhost port 80 with the specific Host header
# This mimics exactly what the browser does hitting the VPS
curl -v -H "Host: pewec.apextime.in" http://127.0.0.1:80/ --head
