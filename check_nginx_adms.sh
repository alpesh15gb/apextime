#!/bin/bash

echo "=== Checking Nginx Configuration for ADMS Protocol ==="
echo ""

# Check if nginx is running
echo "1. Checking Nginx status..."
systemctl status nginx | grep Active

echo ""
echo "2. Finding Nginx config files..."
find /etc/nginx -name "*.conf" -type f

echo ""
echo "3. Checking for apextime/iclock configuration..."
grep -r "iclock\|apextime\|5001" /etc/nginx/ 2>/dev/null || echo "No iclock/apextime config found"

echo ""
echo "4. Checking default site configuration..."
cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "No default config found"

echo ""
echo "5. Testing if port 80 is listening..."
netstat -tuln | grep ":80 " || ss -tuln | grep ":80 "

echo ""
echo "6. Testing if backend port 5001 is accessible..."
curl -s http://localhost:5001/api/health || echo "Backend not accessible on 5001"

echo ""
echo "7. Testing ADMS endpoint directly..."
curl -s "http://localhost:5001/api/iclock/cdata?SN=TEST" || echo "ADMS endpoint not responding"

echo ""
echo "=== Diagnostic Complete ==="
