#!/bin/bash
# setup_nginx.sh
# Link repo configs to Nginx to ensure updates are automatic.

REPO_DIR="/docker/apextime-saas"

if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

echo "Setting up Nginx Symlinks..."

# Helper function
link_site() {
    SRC="$REPO_DIR/$1"
    DEST="/etc/nginx/sites-available/$2"
    
    if [ -f "$SRC" ]; then
        echo "Processing $2..."
        # Backup if it's a real file (not a link)
        if [ -f "$DEST" ] && [ ! -L "$DEST" ]; then
            mv "$DEST" "$DEST.bak_$(date +%F_%H%M)"
            echo "  Backed up existing config."
        fi
        
        # Link Available
        ln -sf "$SRC" "$DEST"
        
        # Link Enabled
        ln -sf "$DEST" "/etc/nginx/sites-enabled/$2"
        echo "  Linked $SRC to $2"
    else
        echo "Warning: Source file $SRC not found!"
    fi
}

link_site "nginx-ksipl-apextime.conf" "ksipl.apextime.in"
link_site "nginx-pewec-apextime.conf" "pewec.apextime.in"
# link_site "nginx-apextime.conf" "default" # Uncomment if you want to override default

echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Reloading Nginx..."
    systemctl reload nginx
    echo "Done! Future git pulls will now automatically update Nginx configuration."
else
    echo "Error: Nginx configuration test failed. Please check the errors above."
fi
