#!/bin/bash

# Fix Pewec Nginx Configuration
# Run this from the repository root (e.g., /docker/apextime-saas)

echo "=== Fixing Pewec Nginx Configuration ==="

# 1. Remove potential broken symlink
echo "[1/5] Removing broken symlink..."
if [ -L "/etc/nginx/sites-enabled/pewec.apextime.in" ]; then
    sudo rm "/etc/nginx/sites-enabled/pewec.apextime.in"
    echo "Removed existing symlink."
elif [ -e "/etc/nginx/sites-enabled/pewec.apextime.in" ]; then
    sudo rm "/etc/nginx/sites-enabled/pewec.apextime.in"
    echo "Removed existing file."
fi

# 2. Verify source config exists in Current Directory
REPO_CONF="nginx-pewec-apextime.conf"
if [ ! -f "$REPO_CONF" ]; then
    echo "ERROR: $REPO_CONF not found in $(pwd)."
    echo "Please make sure you are in the directory where you pulled the git repo."
    exit 1
fi

# 3. Copy config to sites-available
echo "[2/5] Copying config to /etc/nginx/sites-available/..."
sudo cp "$REPO_CONF" /etc/nginx/sites-available/pewec.apextime.in

# 4. Create new Symlink
echo "[3/5] Linking to sites-enabled..."
sudo ln -s /etc/nginx/sites-available/pewec.apextime.in /etc/nginx/sites-enabled/

# 5. Test Configuration
echo "[4/5] Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "[5/5] Configuration Valid. Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Success! pewec.apextime.in should be live."
else
    echo "❌ Configuration Test Failed!"
    echo "Reverting symlink to prevent Nginx crash..."
    sudo rm /etc/nginx/sites-enabled/pewec.apextime.in
    echo "Please check the error output above."
    exit 1
fi
