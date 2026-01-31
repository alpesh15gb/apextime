#!/bin/bash

<<<<<<< HEAD
# SSL Setup Script for saas.apextime.in
# Run this after docker-compose.prod.yml is up

echo "Setting up SSL for saas.apextime.in..."
=======
# SSL Setup Script for ksipl.apextime.in
# Run this after docker-compose.prod.yml is up

echo "Setting up SSL for ksipl.apextime.in..."
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p certbot-data
mkdir -p certbot-www

# Stop any running containers
docker-compose -f docker-compose.prod.yml down

# Start nginx with initial config (HTTP only)
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
sleep 5

# Obtain SSL certificate
docker run -it --rm \
  -v $(pwd)/certbot-data:/etc/letsencrypt \
  -v $(pwd)/certbot-www:/var/www/certbot \
  --network apextime-network \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
<<<<<<< HEAD
  --email admin@saas.apextime.in \
  --agree-tos \
  --no-eff-email \
  -d saas.apextime.in

# Check if certificate was obtained
if [ -d "certbot-data/live/saas.apextime.in" ]; then
=======
  --email admin@ksipl.apextime.in \
  --agree-tos \
  --no-eff-email \
  -d ksipl.apextime.in

# Check if certificate was obtained
if [ -d "certbot-data/live/ksipl.apextime.in" ]; then
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
    echo "SSL certificate obtained successfully!"
    echo "Restarting nginx with SSL configuration..."

    # Copy the production nginx config
    cp nginx/nginx.prod.conf nginx/nginx.active.conf

    # Reload nginx
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

<<<<<<< HEAD
    echo "SSL setup complete! Your site should now be accessible at https://saas.apextime.in"
=======
    echo "SSL setup complete! Your site should now be accessible at https://ksipl.apextime.in"
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
else
    echo "Failed to obtain SSL certificate. Check the logs above."
    exit 1
fi
