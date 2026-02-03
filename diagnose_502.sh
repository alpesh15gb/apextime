#!/bin/bash

echo "=== Diagnosing 502 Bad Gateway Issue ==="
echo ""

# 1. Check for duplicate Nginx configs
echo "1. Checking for duplicate server configurations..."
grep -r "server_name ksipl.apextime.in" /etc/nginx/sites-enabled/
echo ""

# 2. Check if backend is running
echo "2. Checking if backend container is running..."
docker ps | grep backend
echo ""

# 3. Check if port 5001 is listening
echo "3. Checking if port 5001 is listening..."
netstat -tuln | grep 5001 || ss -tuln | grep 5001
echo ""

# 4. Test backend directly
echo "4. Testing backend health endpoint..."
curl -v http://localhost:5001/api/health 2>&1 | head -20
echo ""

# 5. Check docker-compose status
echo "5. Checking docker-compose services..."
cd /docker/apextime-saas
docker-compose -f docker-compose.prod.yml ps
echo ""

# 6. Check backend logs for errors
echo "6. Checking backend logs for errors..."
docker-compose -f docker-compose.prod.yml logs backend --tail=30
echo ""

echo "=== Diagnostic Complete ==="
