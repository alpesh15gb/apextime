#!/bin/bash
# Check Host Nginx Error Logs for 502 details

echo "=== Host Nginx Error Log (Last 50 lines) ==="
sudo tail -n 50 /var/log/nginx/error.log

echo ""
echo "=== Check configuration file on disk ==="
cat /etc/nginx/sites-enabled/pewec.apextime.in

echo ""
echo "=== Check SELinux Status ==="
if command -v getenforce &> /dev/null; then
    getenforce
else
    echo "SELinux not installed/found."
fi
