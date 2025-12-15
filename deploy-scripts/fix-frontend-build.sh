#!/bin/bash

# Fix Frontend Build Issues Script
# Fixes Vite permission and PATH issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🔧 Fixing frontend build issues..."

# Check if we're in the right directory
if [ ! -d "client" ]; then
    print_error "client directory not found. Please run this script from the project root."
    exit 1
fi

# Fix admin frontend
print_status "Fixing admin frontend build..."
cd client/admin-side

# Clear npm cache and reinstall
print_status "Clearing npm cache and reinstalling dependencies..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Fix permissions on node_modules
print_status "Fixing node_modules permissions..."
chmod -R 755 node_modules/

# Try building with npx
print_status "Building admin frontend with npx..."
npx vite build

if [ ! -d "dist" ]; then
    print_warning "npx build failed, trying with npm run build..."
    npm run build
fi

if [ ! -d "dist" ]; then
    print_error "Admin frontend build failed"
    exit 1
fi

print_status "✅ Admin frontend built successfully"

# Fix student frontend
print_status "Fixing student frontend build..."
cd ../student-side

# Clear npm cache and reinstall
print_status "Clearing npm cache and reinstalling dependencies..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Fix permissions on node_modules
print_status "Fixing node_modules permissions..."
chmod -R 755 node_modules/

# Try building with npx
print_status "Building student frontend with npx..."
npx vite build

if [ ! -d "dist" ]; then
    print_warning "npx build failed, trying with npm run build..."
    npm run build
fi

if [ ! -d "dist" ]; then
    print_error "Student frontend build failed"
    exit 1
fi

print_status "✅ Student frontend built successfully"

# Set proper permissions
print_status "Setting proper permissions..."
cd ../../
sudo chown -R ubuntu:www-data client/ 2>/dev/null || chown -R ubuntu:ubuntu client/
chmod -R 755 client/admin-side/dist/
chmod -R 755 client/student-side/dist/

print_status "🎉 Frontend build fix completed successfully!"
print_status "Built files locations:"
echo "  - Admin Frontend: $(pwd)/client/admin-side/dist/"
echo "  - Student Frontend: $(pwd)/client/student-side/dist/"