#!/bin/bash
# Diagnose 502 Error deeper

echo "=== 1. Checking Host -> Container Connectivity ==="
echo "Sending request to localhost:8080 with Host: pewec.apextime.in"
curl -v -H "Host: pewec.apextime.in" http://127.0.0.1:8080 --head

echo ""
echo "=== 2. Checking Container Internal Connectivity ==="
# Exec into nginx container to ping frontend
echo "Attempting to reach 'frontend' from inside 'apextime-nginx'..."
docker exec apextime-nginx ping -c 2 frontend

echo ""
echo "=== 3. Checking Nginx Config matches Disk ==="
docker exec apextime-nginx nginx -T | grep "pewec"

echo ""
echo "=== 4. Checking Frontend Container Logs ==="
docker logs --tail 20 apextime-frontend

echo ""
echo "=== 5. Checking Hosts file inside Nginx Container ==="
docker exec apextime-nginx cat /etc/hosts
