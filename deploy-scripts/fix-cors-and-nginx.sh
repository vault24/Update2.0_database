#!/bin/bash

# Fix CORS and NGINX Configuration Issues
# This script resolves the duplicate upstream and CORS problems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Fixing CORS and NGINX Configuration Issues"
echo "=============================================="

PROJECT_DIR="/home/ubuntu/Update2.0_database"

print_status "Step 1: Removing ALL existing NGINX configurations to prevent conflicts..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/slms*
sudo rm -f /etc/nginx/sites-available/slms*

print_status "Step 2: Creating clean NGINX configuration with CORS support..."
sudo tee /etc/nginx/sites-available/slms-production > /dev/null << 'EOF'
# Production SLMS Configuration with CORS Support
upstream django_backend {
    server 127.0.0.1:8000;
}

# Student Frontend (Port 80)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 47.128.236.25 _;
    
    root /home/ubuntu/Update2.0_database/client/student-side/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # API proxy with CORS support
    location /api/ {
        # Handle preflight requests first
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Proxy to Django backend
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for actual requests
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security: Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;
    server_name 47.128.236.25 _;
    
    root /home/ubuntu/Update2.0_database/client/admin-side/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # API proxy with CORS support
    location /api/ {
        # Handle preflight requests first
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Proxy to Django backend
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for actual requests
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRFToken, Accept, Origin, User-Agent, DNT, Cache-Control, X-Mx-ReqToken, Keep-Alive, X-Requested-With, If-Modified-Since' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security: Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

print_status "Step 3: Enabling the new configuration..."
sudo ln -s /etc/nginx/sites-available/slms-production /etc/nginx/sites-enabled/

print_status "Step 4: Testing NGINX configuration..."
if sudo nginx -t; then
    print_status "✅ NGINX configuration is valid"
else
    print_error "❌ NGINX configuration has errors"
    sudo nginx -t
    exit 1
fi

print_status "Step 5: Reloading systemd and restarting NGINX..."
sudo systemctl daemon-reload
sudo systemctl restart nginx

print_status "Step 6: Verifying NGINX is running..."
if sudo systemctl is-active --quiet nginx; then
    print_status "✅ NGINX is running"
else
    print_error "❌ NGINX is not running"
    sudo systemctl status nginx
    exit 1
fi

print_status "Step 7: Testing the websites..."
sleep 2

echo ""
echo "Testing Student Frontend (Port 80):"
STUDENT_RESULT=$(curl -I http://localhost 2>/dev/null | head -1)
echo "$STUDENT_RESULT"

echo ""
echo "Testing Admin Frontend (Port 8080):"
ADMIN_RESULT=$(curl -I http://localhost:8080 2>/dev/null | head -1)
echo "$ADMIN_RESULT"

echo ""
echo "Testing API endpoint with CORS:"
API_RESULT=$(curl -I http://localhost/api/auth/me/ 2>/dev/null | head -1)
echo "API Response: $API_RESULT"

if [[ "$STUDENT_RESULT" == *"200 OK"* ]] && [[ "$ADMIN_RESULT" == *"200 OK"* ]]; then
    echo ""
    print_status "🎉 SUCCESS! Both websites are working!"
    echo ""
    echo "Your websites are live:"
    echo "🎓 Student Frontend: http://47.128.236.25"
    echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
    echo ""
    print_status "CORS headers have been configured to allow cross-origin requests."
    print_status "The admin frontend should now be able to access the API."
else
    print_warning "Still having issues. Check NGINX logs:"
    echo "sudo tail -10 /var/log/nginx/error.log"
fi

print_status "Step 8: Updating Django settings for production..."
# Update Django settings to include the correct IP in CORS origins
cd "$PROJECT_DIR/server"

# Check if the IP is already in the CORS settings
if ! grep -q "47.128.236.25" slms_core/settings.py; then
    print_status "Adding production IP to Django CORS settings..."
    
    # Create a backup
    sudo cp slms_core/settings.py slms_core/settings.py.backup
    
    # Update CORS_ALLOWED_ORIGINS to include the production IP
    sudo sed -i "s|default='http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8081,http://127.0.0.1:8081,http://18.138.238.106:8000,http://18.138.238.106'|default='http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:8081,http://127.0.0.1:8081,http://18.138.238.106:8000,http://18.138.238.106,http://47.128.236.25,http://47.128.236.25:8080'|g" slms_core/settings.py
    
    # Update CSRF_TRUSTED_ORIGINS as well
    sudo sed -i "s|default='http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.250,http://18.138.238.106:8000,http://18.138.238.106'|default='http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.250,http://18.138.238.106:8000,http://18.138.238.106,http://47.128.236.25,http://47.128.236.25:8080'|g" slms_core/settings.py
    
    print_status "✅ Django CORS settings updated"
    
    # Restart Gunicorn to apply changes
    print_status "Restarting Gunicorn to apply Django changes..."
    sudo systemctl restart gunicorn
    
    # Wait for Gunicorn to restart
    sleep 3
    
    if sudo systemctl is-active --quiet gunicorn; then
        print_status "✅ Gunicorn restarted successfully"
    else
        print_warning "⚠️ Gunicorn restart may have issues. Check status:"
        echo "sudo systemctl status gunicorn"
    fi
else
    print_status "✅ Django CORS settings already include production IP"
fi

echo ""
print_status "🎯 Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Open http://47.128.236.25:8080 in your browser"
echo "2. Check the browser console - CORS errors should be resolved"
echo "3. Try logging in to test API connectivity"
echo ""
echo "If you still see CORS errors, check:"
echo "- Browser developer tools (F12) -> Console tab"
echo "- NGINX error logs: sudo tail -f /var/log/nginx/error.log"
echo "- Gunicorn logs: sudo journalctl -u gunicorn -f"