#!/bin/bash

# SLMS NGINX Configuration Script
# Run this script to configure NGINX for the SLMS project

set -e  # Exit on any error

echo "🚀 Configuring NGINX for SLMS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get current directory
PROJECT_DIR=$(pwd)
SERVER_IP="47.128.236.25"

print_status "Creating NGINX configuration..."
sudo tee /etc/nginx/sites-available/slms > /dev/null << EOF
# Student Frontend (Port 80)
server {
    listen 80;
    server_name $SERVER_IP;
    
    root $PROJECT_DIR/client/student-side/dist;
    index index.html;
    
    # Handle SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Serve static files
    location /static/ {
        alias $PROJECT_DIR/server/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Serve media files
    location /media/ {
        alias $PROJECT_DIR/server/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080;
    server_name $SERVER_IP;
    
    root $PROJECT_DIR/client/admin-side/dist;
    index index.html;
    
    # Handle SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Serve static files
    location /static/ {
        alias $PROJECT_DIR/server/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Serve media files
    location /media/ {
        alias $PROJECT_DIR/server/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

print_status "Enabling SLMS site..."
sudo ln -sf /etc/nginx/sites-available/slms /etc/nginx/sites-enabled/

print_status "Removing default NGINX site..."
sudo rm -f /etc/nginx/sites-enabled/default

print_status "Testing NGINX configuration..."
if sudo nginx -t; then
    print_status "✅ NGINX configuration test passed"
else
    print_error "❌ NGINX configuration test failed"
    exit 1
fi

print_status "Restarting and enabling NGINX..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check if NGINX is running
if sudo systemctl is-active --quiet nginx; then
    print_status "✅ NGINX is running successfully"
else
    print_error "❌ NGINX failed to start"
    print_error "Check logs with: sudo tail -f /var/log/nginx/error.log"
    exit 1
fi

print_status "✅ NGINX configuration completed successfully!"
print_status "Your applications should now be accessible at:"
echo "  - Student Frontend: http://$SERVER_IP"
echo "  - Admin Frontend: http://$SERVER_IP:8080"
echo "  - API: http://$SERVER_IP/api/"

print_warning "Testing the deployment..."
print_status "Checking if services are listening on correct ports..."

# Check if ports are listening
if sudo netstat -tlnp | grep -q ":80 "; then
    print_status "✅ Port 80 is listening"
else
    print_warning "⚠️  Port 80 is not listening"
fi

if sudo netstat -tlnp | grep -q ":8080 "; then
    print_status "✅ Port 8080 is listening"
else
    print_warning "⚠️  Port 8080 is not listening"
fi

if sudo netstat -tlnp | grep -q ":8000 "; then
    print_status "✅ Port 8000 is listening (Gunicorn)"
else
    print_warning "⚠️  Port 8000 is not listening (Gunicorn may not be running)"
fi

print_status "Deployment completed! 🎉"
print_warning "If you encounter any issues, check the logs:"
echo "  - NGINX errors: sudo tail -f /var/log/nginx/error.log"
echo "  - NGINX access: sudo tail -f /var/log/nginx/access.log"
echo "  - Gunicorn: sudo journalctl -u gunicorn -f"