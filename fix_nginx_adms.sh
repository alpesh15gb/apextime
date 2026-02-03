#!/bin/bash

# Fix Nginx Configuration for RealTime Device Connectivity
# Run this on your VPS

echo "=== Fixing Nginx Configuration for ADMS Protocol ==="
echo ""

# 1. Backup current configuration
echo "1. Backing up current Nginx configuration..."
sudo cp /etc/nginx/sites-available/ksipl.apextime.in /etc/nginx/sites-available/ksipl.apextime.in.backup.$(date +%Y%m%d_%H%M%S)

# 2. Update configuration
echo "2. Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/ksipl.apextime.in > /dev/null <<'EOF'
server {
    listen 80;
    server_name ksipl.apextime.in;

    # Increase timeouts for biometric devices
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    client_max_body_size 50M;

    # CRITICAL: ADMS/iClock protocol for RealTime/ESSL devices
    location /api/iclock/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # All other API requests
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 3. Test configuration
echo ""
echo "3. Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration is valid"
    
    # 4. Reload Nginx
    echo ""
    echo "4. Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✓ Nginx reloaded successfully"
    
    # 5. Test endpoints
    echo ""
    echo "5. Testing endpoints..."
    
    echo "   Testing backend health..."
    curl -s http://localhost:5001/api/health && echo " ✓ Backend OK" || echo " ✗ Backend not responding"
    
    echo "   Testing ADMS endpoint..."
    curl -s "http://localhost/api/iclock/cdata?SN=TEST" && echo " ✓ ADMS endpoint OK" || echo " ✗ ADMS endpoint failed"
    
    echo ""
    echo "=== Configuration Complete ==="
    echo ""
    echo "Next steps:"
    echo "1. Configure RealTime machine with: http://ksipl.apextime.in/api/iclock/cdata"
    echo "2. Watch logs: docker-compose -f docker-compose.prod.yml logs -f backend | grep 'INCOMING SN'"
    echo "3. Device should appear online within 30 seconds"
    
else
    echo "✗ Nginx configuration has errors!"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/ksipl.apextime.in.backup.* /etc/nginx/sites-available/ksipl.apextime.in
    echo "Please check the errors above and try again"
    exit 1
fi
