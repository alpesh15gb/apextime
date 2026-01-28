#!/bin/bash

# Deployment script for ksipl.apextime.in

set -e

echo "=== ApexTime Deployment Script ==="
echo ""

# Check if port 80 is in use
echo "Checking if port 80 is available..."
if netstat -tuln | grep -q ':80 '; then
    echo "WARNING: Port 80 is already in use. Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker stop $(docker ps -q) 2>/dev/null || true
    sleep 2
fi

# Pull latest changes
echo "Pulling latest changes..."
git pull origin master

# Build and start
echo "Building and starting containers..."
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
echo "  - http://ksipl.apextime.in:8080 (HTTP)"
echo ""
echo "To get SSL certificate, run:"
echo "  ./scripts/setup-ssl.sh"
