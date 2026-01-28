#!/bin/bash

# Script to fix port 80 and deploy properly

echo "=== Checking what's using port 80 ==="
netstat -tuln | grep ':80 '

echo ""
echo "=== Stopping conflicting containers ==="
docker stop $(docker ps -q) 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

echo ""
echo "=== Killing processes on port 80 ==="
sudo fuser -k 80/tcp 2>/dev/null || true
sleep 2

echo ""
echo "=== Updating docker-compose to use port 80 ==="
sed -i 's/"8080:80"/"80:80"/' docker-compose.prod.yml

echo ""
echo "=== Starting containers on port 80 ==="
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Status ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "App should now be accessible at: http://ksipl.apextime.in (without :8080)"
