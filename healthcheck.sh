#!/bin/bash
# ApexTime Health Check Script
# Run after any deployment to verify all services are up

echo "=== ApexTime Health Check ==="
echo ""

# 1. Check all containers are running
echo "[1/4] Container Status:"
CONTAINERS=("apextime-postgres" "apextime-backend" "apextime-frontend" "apextime-nginx")
ALL_OK=true
for c in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null)
    if [ "$STATUS" = "running" ]; then
        echo "  OK  $c"
    else
        echo "  FAIL  $c (status: ${STATUS:-not found})"
        ALL_OK=false
    fi
done
echo ""

# 2. Check port 8080 (Docker nginx)
echo "[2/4] Port 8080 (Docker Nginx):"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "  OK  Backend reachable via nginx (HTTP $HTTP_CODE)"
else
    echo "  FAIL  Backend not reachable (HTTP $HTTP_CODE)"
    ALL_OK=false
fi
echo ""

# 3. Check internal container connectivity
echo "[3/4] Internal Connectivity:"
INTERNAL=$(docker exec apextime-nginx wget -qO- http://backend:5001/api/health 2>&1)
if echo "$INTERNAL" | grep -q '"ok"'; then
    echo "  OK  nginx -> backend"
else
    echo "  FAIL  nginx -> backend: $INTERNAL"
    ALL_OK=false
fi

FRONTEND=$(docker exec apextime-nginx wget -qO- http://frontend:80/ 2>&1 | head -1)
if echo "$FRONTEND" | grep -q 'html'; then
    echo "  OK  nginx -> frontend"
else
    echo "  FAIL  nginx -> frontend"
    ALL_OK=false
fi
echo ""

# 4. Check HTTPS (if domain configured)
echo "[4/4] HTTPS Check:"
HTTPS_CODE=$(curl -sk -o /dev/null -w "%{http_code}" https://ksipl.apextime.in/api/health 2>/dev/null)
if [ "$HTTPS_CODE" = "200" ]; then
    echo "  OK  HTTPS endpoint (HTTP $HTTPS_CODE)"
else
    echo "  WARN  HTTPS returned $HTTPS_CODE (may need host nginx check)"
fi
echo ""

# Summary
if [ "$ALL_OK" = true ]; then
    echo "=== ALL CHECKS PASSED ==="
else
    echo "=== SOME CHECKS FAILED — SEE ABOVE ==="
    exit 1
fi
