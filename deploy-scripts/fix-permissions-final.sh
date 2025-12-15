#!/bin/bash

# Final Permissions Fix - Solve www-data Access Issue
# This fixes the directory permissions that are blocking www-data access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Final Permissions Fix - Solving www-data Access"
echo "================================================="

PROJECT_DIR="/home/ubuntu/Update2.0_database"

print_status "Step 1: Fixing directory permissions up the entire path..."
# The issue is that www-data needs execute permission on ALL parent directories
sudo chmod 755 /home
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/Update2.0_database
sudo chmod 755 /home/ubuntu/Update2.0_database/client
sudo chmod 755 /home/ubuntu/Update2.0_database/client/student-side
sudo chmod 755 /home/ubuntu/Update2.0_database/client/student-side/dist
sudo chmod 755 /home/ubuntu/Update2.0_database/client/admin-side
sudo chmod 755 /home/ubuntu/Update2.0_database/client/admin-side/dist

print_status "Step 2: Setting proper ownership and file permissions..."
cd "$PROJECT_DIR"
sudo chown -R ubuntu:www-data client/
sudo find client/ -type d -exec chmod 755 {} \;
sudo find client/ -type f -exec chmod 644 {} \;

print_status "Step 3: Testing www-data access..."
if sudo -u www-data test -r /home/ubuntu/Update2.0_database/client/student-side/dist/index.html; then
    print_status "✅ www-data can now read student index.html"
else
    print_error "❌ www-data still cannot read student index.html"
    echo "Checking detailed permissions:"
    ls -la /home/ubuntu/Update2.0_database/client/student-side/dist/index.html
    namei -l /home/ubuntu/Update2.0_database/client/student-side/dist/index.html
    exit 1
fi

if sudo -u www-data test -r /home/ubuntu/Update2.0_database/client/admin-side/dist/index.html; then
    print_status "✅ www-data can now read admin index.html"
else
    print_error "❌ www-data still cannot read admin index.html"
    exit 1
fi

print_status "Step 4: Cleaning up conflicting NGINX configurations..."
sudo rm -f /etc/nginx/sites-enabled/slms
sudo rm -f /etc/nginx/sites-enabled/slms-aws

print_status "Step 5: Installing clean NGINX configuration..."
sudo tee /etc/nginx/sites-available/slms-final > /dev/null << 'EOF'
# Final Clean SLMS Configuration
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

sudo ln -s /etc/nginx/sites-available/slms-final /etc/nginx/sites-enabled/

print_status "Step 6: Testing NGINX configuration..."
if sudo nginx -t; then
    print_status "✅ NGINX configuration is valid"
else
    print_error "❌ NGINX configuration has errors"
    exit 1
fi

print_status "Step 7: Restarting NGINX..."
sudo systemctl restart nginx

print_status "Step 8: Final verification..."
sleep 2

echo ""
echo "Testing Student Frontend:"
STUDENT_RESULT=$(curl -I http://localhost 2>/dev/null | head -1)
echo "$STUDENT_RESULT"

echo ""
echo "Testing Admin Frontend:"
ADMIN_RESULT=$(curl -I http://localhost:8080 2>/dev/null | head -1)
echo "$ADMIN_RESULT"

if [[ "$STUDENT_RESULT" == *"200 OK"* ]] && [[ "$ADMIN_RESULT" == *"200 OK"* ]]; then
    echo ""
    print_status "🎉 SUCCESS! Both websites are now working!"
    echo ""
    echo "Your websites are live:"
    echo "🎓 Student Frontend: http://47.128.236.25"
    echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
else
    print_warning "Still having issues. Check NGINX logs:"
    echo "sudo tail -10 /var/log/nginx/error.log"
fi