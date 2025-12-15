#!/bin/bash

# Clean NGINX Setup - Remove all conflicts and create fresh config
# This completely resets NGINX configuration for clean deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🧹 Clean NGINX Setup - Removing All Conflicts"
echo "============================================="

PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

print_status "Step 1: Stopping NGINX..."
sudo systemctl stop nginx

print_status "Step 2: Backing up and removing ALL site configurations..."
sudo mkdir -p /etc/nginx/sites-backup/$(date +%Y%m%d_%H%M%S)
sudo cp /etc/nginx/sites-enabled/* /etc/nginx/sites-backup/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/default
sudo rm -f /etc/nginx/sites-available/slms-aws
sudo rm -f /etc/nginx/sites-available/sipi-admin*

print_status "Step 3: Creating clean, minimal NGINX configuration..."
sudo tee /etc/nginx/sites-available/slms-clean > /dev/null << 'EOF'
# Clean SLMS Configuration - No Conflicts
upstream django_backend {
    server 127.0.0.1:8000;
}

# Student Frontend (Port 80)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /home/ubuntu/Update2.0_database/client/student-side/dist;
    index index.html;
    
    # API proxy
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
    }
    
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
    }
    
    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;
    
    root /home/ubuntu/Update2.0_database/client/admin-side/dist;
    index index.html;
    
    # API proxy
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
    }
    
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
    }
    
    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

print_status "Step 4: Enabling the clean configuration..."
sudo ln -s /etc/nginx/sites-available/slms-clean /etc/nginx/sites-enabled/

print_status "Step 5: Testing NGINX configuration..."
if sudo nginx -t; then
    print_status "✅ NGINX configuration is valid"
else
    print_error "❌ NGINX configuration has errors"
    exit 1
fi

print_status "Step 6: Starting NGINX..."
sudo systemctl start nginx

print_status "Step 7: Verifying NGINX is running..."
if sudo systemctl is-active --quiet nginx; then
    print_status "✅ NGINX is running"
else
    print_error "❌ NGINX failed to start"
    exit 1
fi

print_status "Step 8: Testing the websites..."
sleep 2
echo ""
echo "Testing Student Frontend:"
curl -I http://localhost 2>/dev/null | head -1 || echo "Connection failed"

echo ""
echo "Testing Admin Frontend:"
curl -I http://localhost:8080 2>/dev/null | head -1 || echo "Connection failed"

echo ""
print_status "🎉 Clean NGINX setup completed!"
echo ""
echo "Your websites should now work:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"