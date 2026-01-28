#!/bin/bash

# Stop Apache and use nginx for ApexTime

echo "=== Stopping Apache ==="
sudo systemctl stop apache2
sudo systemctl disable apache2

echo ""
echo "=== Starting ApexTime on port 80 ==="
cd /docker/apextime/apextime
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Status ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "ApexTime should now be accessible at: http://ksipl.apextime.in"
echo ""
echo "To restart Apache later, run: sudo systemctl start apache2"
