#!/bin/bash

# Fix File Permissions Issue - Targeted Fix for NGINX Permission Denied
# This fixes the specific "Permission denied" error in NGINX logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Fixing NGINX Permission Denied Issue"
echo "========================================"

PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

print_status "Current permissions before fix:"
ls -la client/student-side/ | head -5
ls -la client/admin-side/ | head -5

print_status "Step 1: Fixing directory and file permissions..."

# Fix ownership - make ubuntu the owner
sudo chown -R ubuntu:ubuntu "$PROJECT_DIR"

# Fix directory permissions (755 = rwxr-xr-x)
find "$PROJECT_DIR/client" -type d -exec chmod 755 {} \;

# Fix file permissions (644 = rw-r--r--)
find "$PROJECT_DIR/client" -type f -exec chmod 644 {} \;

# Specifically fix the dist directories
chmod -R 755 "$PROJECT_DIR/client/student-side/dist" 2>/dev/null || true
chmod -R 755 "$PROJECT_DIR/client/admin-side/dist" 2>/dev/null || true

# Make sure NGINX can read the files
sudo chown -R ubuntu:www-data "$PROJECT_DIR/client"
sudo chmod -R 755 "$PROJECT_DIR/client"

print_status "Step 2: Checking NGINX user and group..."
ps aux | grep nginx | head -3

print_status "Step 3: Adding ubuntu user to www-data group..."
sudo usermod -a -G www-data ubuntu

print_status "Step 4: Setting proper group permissions..."
sudo chgrp -R www-data "$PROJECT_DIR/client"
sudo chmod -R g+r "$PROJECT_DIR/client"
sudo chmod -R g+x "$PROJECT_DIR/client"

print_status "Step 5: Verifying permissions after fix..."
echo "Student frontend permissions:"
ls -la "$PROJECT_DIR/client/student-side/dist" | head -5
echo ""
echo "Admin frontend permissions:"
ls -la "$PROJECT_DIR/client/admin-side/dist" | head -5

print_status "Step 6: Testing file access as www-data user..."
sudo -u www-data test -r "$PROJECT_DIR/client/student-side/dist/index.html" && print_status "✅ www-data can read student index.html" || print_error "❌ www-data cannot read student index.html"
sudo -u www-data test -r "$PROJECT_DIR/client/admin-side/dist/index.html" && print_status "✅ www-data can read admin index.html" || print_error "❌ www-data cannot read admin index.html"

print_status "Step 7: Restarting NGINX to clear any cached permission errors..."
sudo systemctl restart nginx

print_status "Step 8: Testing the websites..."
sleep 2

echo ""
echo "🎉 Permission fix completed!"
echo ""
echo "Testing your websites now:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
print_status "If you still see errors, check the logs:"
echo "sudo tail -f /var/log/nginx/error.log"