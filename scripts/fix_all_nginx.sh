#!/bin/bash
# Fix ALL Host Nginx Configs to use port 8080

echo "=== Updating KSIPL/ApexTime Nginx Configs ==="

# 1. PEWEC (Already Fixed, but ensure it's there)
# Just creating links for others now
echo "[1/2] Updating ksipl.apextime.in config..."
sudo cp nginx-ksipl-apextime.conf /etc/nginx/sites-available/ksipl.apextime.in
# We assume symlink already exists

echo "[2/2] Reloading Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✅ Success! All domains should now point to port 8080."
else
    echo "❌ Nginx Config Error"
fi
