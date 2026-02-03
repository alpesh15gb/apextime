#!/bin/bash

echo "=========================================="
echo "RealTime Device Connection Checker"
echo "Serial Number: RSS20230760881"
echo "=========================================="
echo ""

cd /docker/apextime-saas

echo "1. Checking if device exists in database..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma db execute --stdin <<EOF
SELECT id, name, deviceId, protocol, status, lastSeen 
FROM Device 
WHERE deviceId LIKE '%RSS20230760881%';
EOF

echo ""
echo "2. Checking recent backend logs for this device..."
docker-compose -f docker-compose.prod.yml logs backend --tail=500 | grep -i "RSS20230760881" | tail -20

echo ""
echo "3. Checking for ANY incoming ADMS connections in last 500 lines..."
docker-compose -f docker-compose.prod.yml logs backend --tail=500 | grep "INCOMING SN" | tail -10

echo ""
echo "4. Testing if iclock endpoint is accessible..."
curl -s "http://localhost:5001/api/iclock/cdata?SN=RSS20230760881" || echo "Endpoint not accessible!"

echo ""
echo "5. Checking if port 5001 is listening..."
netstat -tuln | grep 5001 || ss -tuln | grep 5001

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
