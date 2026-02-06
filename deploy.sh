#!/bin/bash
# ApexTime Safe Deploy Script
# Usage: ./deploy.sh [backend|frontend|all]

set -e
TARGET=${1:-backend}
cd /docker/apextime-saas

echo "=== ApexTime Deploy: $TARGET ==="
echo ""

# Pull latest code
echo "[1/3] Pulling latest code..."
git pull origin master
echo ""

# Build and restart only the target
echo "[2/3] Building and restarting $TARGET..."
case $TARGET in
    backend)
        docker-compose up -d --build backend
        ;;
    frontend)
        docker-compose up -d --build frontend
        ;;
    all)
        docker-compose up -d --build
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: ./deploy.sh [backend|frontend|all]"
        exit 1
        ;;
esac

# Wait for services to start
echo "Waiting 10 seconds for services to stabilize..."
sleep 10

# Run health check
echo ""
echo "[3/3] Running health check..."
bash ./healthcheck.sh
