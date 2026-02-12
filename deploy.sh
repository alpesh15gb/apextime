#!/bin/bash
# ApexTime Robust Deploy Script
# Usage: ./deploy.sh [backend|frontend|all]

set -e
TARGET=${1:-all}

# Detect docker vs docker-compose
if docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
else
    DOCKER_CMD="docker-compose"
fi

COMPOSE_FILE="docker-compose.prod.yml"

echo "=== ApexTime Robust Deploy: $TARGET ==="
echo "Using: $DOCKER_CMD -f $COMPOSE_FILE"
echo ""

# 1. Pull latest code (Optional, usually done before running this)
# echo "[1/3] Pulling latest code..."
# git pull origin master
# echo ""

# 2. Build and restart
echo "[2/3] Building and restarting $TARGET..."
case $TARGET in
    backend)
        $DOCKER_CMD -f $COMPOSE_FILE up -d --build backend
        ;;
    frontend)
        $DOCKER_CMD -f $COMPOSE_FILE up -d --build frontend
        ;;
    all)
        # Full stack restart ensures network and dependencies are fresh
        $DOCKER_CMD -f $COMPOSE_FILE down --remove-orphans
        $DOCKER_CMD -f $COMPOSE_FILE up -d --build
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: ./deploy.sh [backend|frontend|all]"
        exit 1
        ;;
esac

# 3. Wait for services to start
echo "Waiting 15 seconds for services to stabilize..."
sleep 15

# 4. Run health check
echo ""
echo "[3/3] Checking status..."
$DOCKER_CMD -f $COMPOSE_FILE ps

echo ""
echo "=== Deployment Complete ==="
echo "If you still see 502, wait 30 more seconds for the backend to finish migrations."
