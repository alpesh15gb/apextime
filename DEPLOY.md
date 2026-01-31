<<<<<<< HEAD
# Deployment Guide for saas.apextime.in
=======
# Deployment Guide for ksipl.apextime.in
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

## Prerequisites

- Server with Docker and Docker Compose installed
<<<<<<< HEAD
- DNS A record pointing saas.apextime.in to your server IP
=======
- DNS A record pointing ksipl.apextime.in to your server IP
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
- Ports 80 and 443 open in firewall

## Initial Deployment Steps

### 1. Clone the repository on your server

```bash
<<<<<<< HEAD
git clone https://github.com/alpesh15gb/apextime.git apextime-saas
cd apextime-saas
chmod +x scripts/*.sh
=======
git clone https://github.com/alpesh15gb/apextime.git
cd apextime
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and update the values:

```env
# Database Configuration
POSTGRES_USER=apextime
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=apextime

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key

# SQL Server (Source Database)
SQL_SERVER_HOST=115.98.2.20
SQL_SERVER_PORT=1433
SQL_SERVER_USER=essl
SQL_SERVER_PASSWORD=Keystone@456
SQL_SERVER_DATABASE=etimetracklite1
```

### 3. Build and start the application (HTTP first)

```bash
# Use the initial nginx config for HTTP
cp nginx/nginx.init.conf nginx/nginx.active.conf

# Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Set up SSL Certificate

```bash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

This will:
- Obtain SSL certificate from Let's Encrypt
- Configure nginx for HTTPS
- Set up auto-renewal

### 5. Verify deployment

<<<<<<< HEAD
Visit: https://saas.apextime.in
=======
Visit: https://ksipl.apextime.in
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

Default login:
- Username: `admin`
- Password: `admin`

**Important:** Change the default password immediately after first login!

## Updating the Application

To deploy updates:

```bash
<<<<<<< HEAD
cd apextime-saas
=======
cd apextime
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
git pull origin master
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Check logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs

# Specific service
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs nginx
```

### SSL Certificate Issues

If SSL certificate renewal fails:

```bash
docker-compose -f docker-compose.prod.yml exec certbot certbot renew --force-renewal
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Database Migrations

If you need to run migrations manually:

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Backup

To backup the database:

```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U apextime apextime > backup.sql
```

To restore:

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U apextime apextime < backup.sql
```
