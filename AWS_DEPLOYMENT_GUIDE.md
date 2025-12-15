# AWS Ubuntu Server Deployment Guide - SLMS Project

## Overview

This guide will help you deploy your Student Learning Management System (SLMS) on an AWS Ubuntu EC2 server for test production use.

**Server Information:**
- OS: Ubuntu (AWS EC2)
- Public IP: 47.128.236.25
- Single server deployment

**Final URLs:**
- Admin Frontend: http://47.128.236.25:8080
- Student Frontend: http://47.128.236.25:80 (default port)
- Backend API: http://127.0.0.1:8000 (internal only, accessed via NGINX proxy)

## Prerequisites

Before starting, ensure you have:
- SSH access to your AWS Ubuntu server
- Root or sudo privileges
- Your project code uploaded to the server

## Step 1: Initial Server Setup

### 1.1 Connect to Your Server

```bash
ssh -i your-key.pem ubuntu@47.128.236.25
```

### 1.2 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Required Software

```bash
# Install Python, Node.js, PostgreSQL, and NGINX
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx curl

# Install Node.js 18+ (required for Vite)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
python3 --version
node --version
npm --version
nginx -v
psql --version
```

## Step 2: Database Setup

### 2.1 Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user (run these commands in PostgreSQL shell)
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
ALTER USER sipi_web CREATEDB;
\q
```

### 2.2 Configure PostgreSQL for Local Connections

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add this line (or modify existing local line):
local   all             sipi_web                                md5

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

## Step 3: Project Setup

### 3.1 Clone/Upload Your Project

```bash
# If using git (recommended)
cd /home/ubuntu
git clone https://github.com/vault24/Update2.0_database.git slms-project
cd slms-project

# Or if you uploaded files manually, navigate to your project directory
# cd /path/to/your/project
```

### 3.2 Backend Setup

```bash
cd server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create production environment file
cp .env.example .env
nano .env
```

**Edit the `.env` file with production settings:**

```env
# Database Configuration
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=sipiadmin
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY=your-very-secure-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=47.128.236.25,localhost,127.0.0.1

# CORS Settings
CORS_ALLOWED_ORIGINS=http://47.128.236.25:8080,http://47.128.236.25:80,http://47.128.236.25
```

### 3.3 Django Configuration

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput

# Test the server (optional)
python manage.py runserver 127.0.0.1:8000
# Press Ctrl+C to stop after testing
```

### 3.4 Setup Gunicorn for Production

```bash
# Install Gunicorn
pip install gunicorn

# Test Gunicorn
gunicorn --bind 127.0.0.1:8000 slms_core.wsgi:application
# Press Ctrl+C to stop after testing
```

### 3.5 Create Gunicorn Service

```bash
sudo nano /etc/systemd/system/gunicorn.service
```

**Add this content:**

```ini
[Unit]
Description=gunicorn daemon for SLMS
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/slms-project/server
ExecStart=/home/ubuntu/slms-project/server/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          slms_core.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start Gunicorn service
sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

# Check status
sudo systemctl status gunicorn
```

## Step 4: Frontend Setup

### 4.1 Build Admin Frontend

```bash
cd /home/ubuntu/slms-project/client/admin-side

# Install dependencies
npm install

# Create production environment file
cp .env.example .env
nano .env
```

**Edit admin `.env` file:**

```env
VITE_API_BASE_URL=http://47.128.236.25/api
```

```bash
# Build for production
npm run build

# The built files will be in the 'dist' directory
```

### 4.2 Build Student Frontend

```bash
cd /home/ubuntu/slms-project/client/student-side

# Install dependencies
npm install

# Create production environment file
cp .env.example .env
nano .env
```

**Edit student `.env` file:**

```env
VITE_API_BASE_URL=http://47.128.236.25/api
```

```bash
# Build for production
npm run build

# The built files will be in the 'dist' directory
```

## Step 5: NGINX Configuration

### 5.1 Create NGINX Configuration

```bash
sudo nano /etc/nginx/sites-available/slms
```

**Add this configuration:**

```nginx
# Student Frontend (Port 80)
server {
    listen 80;
    server_name 47.128.236.25;
    
    root /home/ubuntu/slms-project/client/student-side/dist;
    index index.html;
    
    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Serve static files
    location /static/ {
        alias /home/ubuntu/slms-project/server/staticfiles/;
    }
    
    # Serve media files
    location /media/ {
        alias /home/ubuntu/slms-project/server/media/;
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080;
    server_name 47.128.236.25;
    
    root /home/ubuntu/slms-project/client/admin-side/dist;
    index index.html;
    
    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Serve static files
    location /static/ {
        alias /home/ubuntu/slms-project/server/staticfiles/;
    }
    
    # Serve media files
    location /media/ {
        alias /home/ubuntu/slms-project/server/media/;
    }
}
```

### 5.2 Enable NGINX Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/slms /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test NGINX configuration
sudo nginx -t

# If test passes, restart NGINX
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5.3 Set Proper Permissions

```bash
# Set permissions for NGINX to access files
sudo chown -R ubuntu:www-data /home/ubuntu/slms-project/
sudo chmod -R 755 /home/ubuntu/slms-project/client/admin-side/dist/
sudo chmod -R 755 /home/ubuntu/slms-project/client/student-side/dist/
sudo chmod -R 755 /home/ubuntu/slms-project/server/staticfiles/
```

## Step 6: Firewall Configuration

### 6.1 Configure UFW (Ubuntu Firewall)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP traffic
sudo ufw allow 80
sudo ufw allow 8080

# Check status
sudo ufw status
```

### 6.2 AWS Security Group

Make sure your AWS Security Group allows:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 8080 (Admin Frontend)

## Step 7: Testing and Verification

### 7.1 Check Services Status

```bash
# Check all services are running
sudo systemctl status postgresql
sudo systemctl status gunicorn
sudo systemctl status nginx

# Check if ports are listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8000
```

### 7.2 Test the Deployment

1. **Test Student Frontend:**
   - Open browser: `http://47.128.236.25`
   - Should load the student dashboard

2. **Test Admin Frontend:**
   - Open browser: `http://47.128.236.25:8080`
   - Should load the admin dashboard

3. **Test API:**
   - Check: `http://47.128.236.25/api/`
   - Should return API response

### 7.3 Check Logs for Issues

```bash
# Check Gunicorn logs
sudo journalctl -u gunicorn -f

# Check NGINX logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check Django logs (if configured)
tail -f /home/ubuntu/slms-project/server/logs/django.log
```

## Step 8: Maintenance and Updates

### 8.1 Update Backend Code

```bash
cd /home/ubuntu/slms-project
git pull origin main

cd server
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

sudo systemctl restart gunicorn
```

### 8.2 Update Frontend Code

```bash
cd /home/ubuntu/slms-project

# Update admin frontend
cd client/admin-side
npm install
npm run build

# Update student frontend
cd ../student-side
npm install
npm run build

# Restart NGINX
sudo systemctl restart nginx
```

### 8.3 Database Backup

```bash
# Create backup script
nano /home/ubuntu/backup_db.sh
```

**Add this content:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U sipi_web -h localhost sipi_db > /home/ubuntu/backups/sipi_db_$DATE.sql
```

```bash
# Make executable and create backup directory
chmod +x /home/ubuntu/backup_db.sh
mkdir -p /home/ubuntu/backups

# Run backup
./backup_db.sh
```

## Troubleshooting

### Common Issues and Solutions

1. **502 Bad Gateway Error:**
   - Check if Gunicorn is running: `sudo systemctl status gunicorn`
   - Check Gunicorn logs: `sudo journalctl -u gunicorn -f`
   - Restart Gunicorn: `sudo systemctl restart gunicorn`

2. **Static Files Not Loading:**
   - Run: `python manage.py collectstatic --noinput`
   - Check NGINX configuration for static file paths
   - Verify file permissions

3. **Database Connection Error:**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database credentials in `.env`
   - Test connection: `psql -U sipi_web -d sipi_db -h localhost`

4. **CORS Errors:**
   - Check `CORS_ALLOWED_ORIGINS` in Django settings
   - Verify frontend `.env` files have correct API URLs
   - Restart Gunicorn after changes

5. **Frontend Not Loading:**
   - Check NGINX error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify build files exist in `dist/` directories
   - Check file permissions

### Useful Commands

```bash
# Restart all services
sudo systemctl restart gunicorn nginx postgresql

# Check service logs
sudo journalctl -u gunicorn -f
sudo journalctl -u nginx -f

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep gunicorn
ps aux | grep nginx
```

## Security Considerations

1. **Change Default Passwords:**
   - Update database password
   - Change Django SECRET_KEY
   - Use strong passwords for admin accounts

2. **Regular Updates:**
   - Keep system packages updated
   - Update Python dependencies regularly
   - Monitor for security vulnerabilities

3. **Backup Strategy:**
   - Regular database backups
   - Code repository backups
   - System configuration backups

## Performance Optimization

1. **Database Optimization:**
   - Configure PostgreSQL for production
   - Add database indexes as needed
   - Monitor query performance

2. **Static File Serving:**
   - Use NGINX for static files (already configured)
   - Consider CDN for better performance

3. **Caching:**
   - Implement Redis for session storage
   - Add database query caching
   - Use browser caching headers

## Monitoring

1. **Log Monitoring:**
   - Set up log rotation
   - Monitor error logs regularly
   - Consider centralized logging

2. **Performance Monitoring:**
   - Monitor server resources (CPU, memory, disk)
   - Track application performance
   - Set up alerts for issues

3. **Uptime Monitoring:**
   - Use external monitoring services
   - Set up health check endpoints
   - Configure notifications

## Conclusion

Your SLMS project should now be successfully deployed on AWS Ubuntu server. The system provides:

- Student frontend accessible at `http://47.128.236.25`
- Admin frontend accessible at `http://47.128.236.25:8080`
- Backend API properly proxied through NGINX
- Production-ready configuration with proper security

Remember to:
- Monitor logs regularly
- Keep backups updated
- Apply security updates
- Monitor system performance

For any issues, refer to the troubleshooting section or check the service logs for detailed error information.