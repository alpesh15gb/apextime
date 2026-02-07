#!/bin/bash
# Debug script for Pewec 502 Error

echo "=== Debugging Pewec Connection ==="

# 1. Check if Nginx Service exists in docker-compose.yml
if grep -q "nginx:" docker-compose.yml; then
    echo "[1/4] Found 'nginx' service in docker-compose.yml"
    
    echo "[2/4] Rebuilding and Restarting Docker Nginx..."
    # We use the default docker-compose.yml because that's where nginx is defined
    docker-compose up -d --build --force-recreate nginx
else
    echo "❌ ERROR: 'nginx' service not found in docker-compose.yml"
    echo "Checking if it's in prod..."
    if grep -q "nginx:" docker-compose.prod.yml; then
        echo "Found in prod! Starting with prod file..."
        docker-compose -f docker-compose.prod.yml up -d --build --force-recreate nginx
    else
        echo "❌ ERROR: nginx service not found in any compose file!"
    fi
fi

# 2. Check logs for potential errors
echo ""
echo "[3/4] Checking recent Nginx logs..."
docker logs --tail 20 apextime-nginx

# 3. Verify Port Binding
echo ""
echo "[4/4] Verifying Ports..."
netstat -tulpn | grep 8080

echo ""
echo "=== Done ==="
echo "If 8080 is listening and logs look okay, try accessing the site again."
