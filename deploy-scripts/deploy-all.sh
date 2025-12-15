#!/bin/bash

# SLMS Complete Deployment Script
# This script runs all deployment steps in sequence

set -e  # Exit on any error

echo "🚀 Starting Complete SLMS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as the ubuntu user"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "deploy-scripts/setup-server.sh" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "Step 1: Setting up server environment..."
chmod +x deploy-scripts/setup-server.sh
./deploy-scripts/setup-server.sh

print_step "Step 2: Deploying backend..."
chmod +x deploy-scripts/deploy-backend.sh
./deploy-scripts/deploy-backend.sh

print_step "Step 3: Building and deploying frontend..."
chmod +x deploy-scripts/deploy-frontend.sh
./deploy-scripts/deploy-frontend.sh

print_step "Step 4: Configuring NGINX..."
chmod +x deploy-scripts/configure-nginx.sh
./deploy-scripts/configure-nginx.sh

print_status "✅ Complete deployment finished successfully! 🎉"

echo ""
echo "=========================================="
echo "🎯 DEPLOYMENT SUMMARY"
echo "=========================================="
echo "✅ Server environment configured"
echo "✅ PostgreSQL database set up"
echo "✅ Django backend deployed with Gunicorn"
echo "✅ Frontend applications built and deployed"
echo "✅ NGINX configured and running"
echo ""
echo "🌐 Your applications are now accessible at:"
echo "   📱 Student Frontend: http://47.128.236.25"
echo "   🏢 Admin Frontend:   http://47.128.236.25:8080"
echo "   🔧 API Endpoint:     http://47.128.236.25/api/"
echo ""
echo "🔍 To check service status:"
echo "   sudo systemctl status gunicorn"
echo "   sudo systemctl status nginx"
echo "   sudo systemctl status postgresql"
echo ""
echo "📋 To view logs:"
echo "   sudo journalctl -u gunicorn -f"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔄 To restart services:"
echo "   sudo systemctl restart gunicorn"
echo "   sudo systemctl restart nginx"
echo ""
print_warning "Remember to:"
echo "1. Update your Django SECRET_KEY in server/.env"
echo "2. Create a Django superuser if you haven't already"
echo "3. Configure your AWS Security Group to allow ports 80 and 8080"
echo "4. Set up regular database backups"
echo ""
print_status "Deployment completed successfully! 🚀"