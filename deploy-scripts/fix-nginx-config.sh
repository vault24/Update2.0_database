#!/bin/bash

# Fix NGINX Configuration for AWS Deployment
# This script replaces the incorrect NGINX config with the correct paths

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Fixing NGINX Configuration for AWS Deployment"
echo "================================================"

PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

print_status "Step 1: Backing up current NGINX configuration..."
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

print_status "Step 2: Removing old/conflicting configurations..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/sipi-admin.conf
sudo rm -f /etc/nginx/sites-available/sipi-admin.conf

print_status "Step 3: Installing corrected NGINX configuration..."
sudo cp deploy-scripts/nginx-aws-config.conf /etc/nginx/sites-available/slms-aws
sudo ln -sf /etc/nginx/sites-available/slms-aws /etc/nginx/sites-enabled/slms-aws

print_status "Step 4: Testing NGINX configuration..."
if sudo nginx -t; then
    print_status "✅ NGINX configuration is valid"
else
    print_error "❌ NGINX configuration has errors"
    echo "Please check the configuration manually"
    exit 1
fi

print_status "Step 5: Reloading systemd and restarting NGINX..."
sudo systemctl daemon-reload
sudo systemctl restart nginx

print_status "Step 6: Verifying NGINX is running..."
if sudo systemctl is-active --quiet nginx; then
    print_status "✅ NGINX is running"
else
    print_error "❌ NGINX failed to start"
    echo "Check logs with: sudo journalctl -u nginx -n 20"
    exit 1
fi

print_status "Step 7: Testing the websites..."
echo ""
echo "Testing Student Frontend (Port 80):"
curl -I http://localhost 2>/dev/null | head -1 || echo "Failed to connect"

echo ""
echo "Testing Admin Frontend (Port 8080):"
curl -I http://localhost:8080 2>/dev/null | head -1 || echo "Failed to connect"

echo ""
print_status "🎉 NGINX configuration updated!"
echo ""
echo "Your websites should now work:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
print_status "If there are still issues, check:"
echo "1. NGINX error logs: sudo tail -f /var/log/nginx/error.log"
echo "2. NGINX access logs: sudo tail -f /var/log/nginx/access.log"
echo "3. Gunicorn status: sudo systemctl status gunicorn"