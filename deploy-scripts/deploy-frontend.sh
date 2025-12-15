#!/bin/bash

# SLMS Frontend Deployment Script
# Run this script to build and deploy both frontend applications

set -e  # Exit on any error

echo "🚀 Starting Frontend Deployment..."

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

# Get server IP (you may need to adjust this)
SERVER_IP="47.128.236.25"

# Check if we're in the right directory
if [ ! -d "client" ]; then
    print_error "client directory not found. Please run this script from the project root."
    exit 1
fi

print_status "Building Admin Frontend..."
cd client/admin-side

# Create production environment file
print_status "Creating admin frontend environment file..."
cat > .env << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
EOF

print_status "Installing admin frontend dependencies..."
npm install

print_status "Building admin frontend for production..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Admin frontend build failed - dist directory not found"
    exit 1
fi

print_status "✅ Admin frontend built successfully"

print_status "Building Student Frontend..."
cd ../student-side

# Create production environment file
print_status "Creating student frontend environment file..."
cat > .env << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
EOF

print_status "Installing student frontend dependencies..."
npm install

print_status "Building student frontend for production..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Student frontend build failed - dist directory not found"
    exit 1
fi

print_status "✅ Student frontend built successfully"

print_status "Setting proper permissions..."
cd ../../
sudo chown -R ubuntu:www-data client/
sudo chmod -R 755 client/admin-side/dist/
sudo chmod -R 755 client/student-side/dist/
sudo chmod -R 755 server/staticfiles/ 2>/dev/null || true

print_status "✅ Frontend deployment completed successfully!"
print_status "Built files locations:"
echo "  - Admin Frontend: $(pwd)/client/admin-side/dist/"
echo "  - Student Frontend: $(pwd)/client/student-side/dist/"
print_warning "Next step: Configure NGINX using the provided configuration file"