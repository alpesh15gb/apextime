#!/bin/bash

<<<<<<< HEAD
# Deployment script for saas.apextime.in
=======
# Deployment script for ksipl.apextime.in
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

set -e

echo "=== ApexTime Deployment Script ==="
echo ""

<<<<<<< HEAD
# Check if port 80 is in use (Skipping this check as we are using 8080/8443)
# To avoid conflict with existing Nginx/Apache on host
=======
# Check if port 80 is in use
echo "Checking if port 80 is available..."
if netstat -tuln | grep -q ':80 '; then
    echo "WARNING: Port 80 is already in use. Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker stop $(docker ps -q) 2>/dev/null || true
    sleep 2
fi
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

# Pull latest changes
echo "Pulling latest changes..."
git pull origin master

# Build and start
echo "Building and starting containers..."
<<<<<<< HEAD
echo "Removing old containers..."
docker rm -f apextime-frontend apextime-backend apextime-nginx apextime-postgres 2>/dev/null || true
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "=== Container Status ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=== Logs (last 20 lines) ==="
docker-compose -f docker-compose.prod.yml logs --tail=20

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Site should be accessible at:"
<<<<<<< HEAD
echo "  - http://saas.apextime.in:8080 (HTTP)"
=======
echo "  - http://ksipl.apextime.in:8080 (HTTP)"
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
echo ""
echo "To get SSL certificate, run:"
echo "  ./scripts/setup-ssl.sh"
