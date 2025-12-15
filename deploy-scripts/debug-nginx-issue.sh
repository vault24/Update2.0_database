#!/bin/bash

# Debug NGINX 500 Error Issue
# This script provides detailed diagnostics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔍 Debugging NGINX 500 Error Issue"
echo "=================================="

print_status "Step 1: Checking NGINX error logs..."
echo "Recent NGINX errors:"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No error logs found"

echo ""
print_status "Step 2: Checking enabled NGINX sites..."
echo "Enabled sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
print_status "Step 3: Checking file existence and permissions..."
echo "Student frontend files:"
ls -la /home/ubuntu/Update2.0_database/client/student-side/dist/ 2>/dev/null || echo "Directory not found"

echo ""
echo "Admin frontend files:"
ls -la /home/ubuntu/Update2.0_database/client/admin-side/dist/ 2>/dev/null || echo "Directory not found"

echo ""
print_status "Step 4: Testing file access as www-data user..."
if sudo -u www-data test -r /home/ubuntu/Update2.0_database/client/student-side/dist/index.html; then
    print_status "✅ www-data can read student index.html"
else
    print_error "❌ www-data CANNOT read student index.html"
fi

if sudo -u www-data test -r /home/ubuntu/Update2.0_database/client/admin-side/dist/index.html; then
    print_status "✅ www-data can read admin index.html"
else
    print_error "❌ www-data CANNOT read admin index.html"
fi

echo ""
print_status "Step 5: Checking NGINX configuration syntax..."
sudo nginx -t

echo ""
print_status "Step 6: Checking active NGINX configuration..."
echo "Current NGINX config content:"
sudo cat /etc/nginx/sites-enabled/* 2>/dev/null | head -20

echo ""
print_status "Step 7: Testing direct file access..."
echo "Testing if we can read the files directly:"
curl -I http://localhost/index.html 2>/dev/null | head -1 || echo "Failed to access student index.html"
curl -I http://localhost:8080/index.html 2>/dev/null | head -1 || echo "Failed to access admin index.html"

echo ""
print_status "Step 8: Checking process status..."
echo "NGINX process:"
ps aux | grep nginx | grep -v grep || echo "No NGINX processes found"

echo ""
echo "Gunicorn process:"
ps aux | grep gunicorn | grep -v grep || echo "No Gunicorn processes found"

echo ""
print_status "🎯 Diagnosis complete. Check the output above for issues."