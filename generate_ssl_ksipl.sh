#!/bin/bash

# Script to regenerate SSL certificates for ksipl.apextime.in

echo "=== Certbot SSL Generation Code ==="
echo ""
echo "1. Requesting certificate for ksipl.apextime.in..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d ksipl.apextime.in

if [ $? -eq 0 ]; then
    echo "SUCCESS: Certificate generated."
    echo ""
    echo "2. Please uncomment the SSL block in nginx/nginx.prod.conf"
    echo "   and restart nginx: docker-compose -f docker-compose.prod.yml restart nginx"
else
    echo "ERROR: Certificate generation failed."
    echo "Check if ksipl.apextime.in points to this server IP and port 80 is open."
fi
