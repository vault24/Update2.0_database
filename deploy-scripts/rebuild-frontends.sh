#!/bin/bash

# Rebuild Frontend Applications - Fix Missing index.html Files
# This rebuilds both React frontends to ensure index.html files are created

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Rebuilding Frontend Applications"
echo "===================================="

PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

print_status "Current dist directory contents:"
echo "Student frontend dist:"
ls -la client/student-side/dist/ 2>/dev/null || echo "Directory doesn't exist or is empty"
echo ""
echo "Admin frontend dist:"
ls -la client/admin-side/dist/ 2>/dev/null || echo "Directory doesn't exist or is empty"
echo ""

# Rebuild Student Frontend
print_status "Step 1: Rebuilding Student Frontend..."
cd client/student-side

print_status "Cleaning previous build..."
rm -rf dist/ node_modules/.vite 2>/dev/null || true

print_status "Installing dependencies..."
npm install

print_status "Building student frontend..."
npm run build

if [ -f "dist/index.html" ]; then
    print_status "✅ Student frontend built successfully - index.html exists"
    ls -la dist/ | head -5
else
    print_error "❌ Student frontend build failed - no index.html"
    echo "Build output:"
    ls -la dist/ 2>/dev/null || echo "No dist directory created"
fi

# Rebuild Admin Frontend
print_status "Step 2: Rebuilding Admin Frontend..."
cd ../admin-side

print_status "Cleaning previous build..."
rm -rf dist/ node_modules/.vite 2>/dev/null || true

print_status "Installing dependencies..."
npm install

print_status "Building admin frontend..."
npm run build

if [ -f "dist/index.html" ]; then
    print_status "✅ Admin frontend built successfully - index.html exists"
    ls -la dist/ | head -5
else
    print_error "❌ Admin frontend build failed - no index.html"
    echo "Build output:"
    ls -la dist/ 2>/dev/null || echo "No dist directory created"
fi

# Fix permissions
print_status "Step 3: Setting proper permissions..."
cd "$PROJECT_DIR"

# Set ownership and permissions
sudo chown -R ubuntu:www-data client/
sudo chmod -R 755 client/
sudo find client/ -type f -exec chmod 644 {} \;

print_status "Step 4: Verifying final build..."
echo "Student frontend final check:"
if [ -f "client/student-side/dist/index.html" ]; then
    print_status "✅ Student index.html exists"
    sudo -u www-data test -r "client/student-side/dist/index.html" && print_status "✅ www-data can read it" || print_error "❌ www-data cannot read it"
else
    print_error "❌ Student index.html missing"
fi

echo ""
echo "Admin frontend final check:"
if [ -f "client/admin-side/dist/index.html" ]; then
    print_status "✅ Admin index.html exists"
    sudo -u www-data test -r "client/admin-side/dist/index.html" && print_status "✅ www-data can read it" || print_error "❌ www-data cannot read it"
else
    print_error "❌ Admin index.html missing"
fi

print_status "Step 5: Restarting NGINX..."
sudo systemctl restart nginx

echo ""
echo "🎉 Frontend rebuild completed!"
echo ""
echo "Your websites should now work:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
print_status "If there are still issues, check:"
echo "1. Build logs above for any errors"
echo "2. NGINX logs: sudo tail -f /var/log/nginx/error.log"