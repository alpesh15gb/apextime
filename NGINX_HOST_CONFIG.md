# Nginx Host Configuration for ApexTime (KSIPL)

If you are running ApexTime via Docker on a VPS that already has Nginx installed on the host, use the following configuration to ensure your website and biometric devices work correctly.

### 1. Identify the Ports
In your `docker-compose.prod.yml`, ensure the following ports are mapped:
- **Backend API**: `8080:5001`
- **Frontend Web**: `3000:80`

### 2. Update Nginx Site Config
Edit `/etc/nginx/sites-enabled/ksipl.apextime.in` and paste this:

```nginx
server {
    listen 80;
    server_name ksipl.apextime.in;

    # ADMS Protcol for ESSL/ZKTeco/RealTime Devices (Allow HTTP)
    location /iclock/ {
        proxy_pass http://127.0.0.1:8080/api/iclock/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }

    # Backup ADMS Path
    location /api/iclock/ {
        proxy_pass http://127.0.0.1:8080/api/iclock/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Redirect others to HTTPS (Dashboard)
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ksipl.apextime.in;

    ssl_certificate /etc/letsencrypt/live/ksipl.apextime.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ksipl.apextime.in/privkey.pem;

    # Standard Dashboard (Frontend)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # System API (Backend)
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # Biometrics over HTTPS
    location /iclock/ {
        proxy_pass http://127.0.0.1:8080/api/iclock/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
}
```

### 3. Restart Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```
