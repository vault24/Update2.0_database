#!/bin/bash

# Quick 500 Error Diagnosis for AWS Deployment
# Run this first to identify the root cause

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔍 Quick 500 Error Diagnosis for AWS Server 47.128.236.25"
echo "=================================================="

# Check services
echo "📊 Service Status:"
services=("postgresql" "gunicorn" "nginx")
for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        print_status "✅ $service: Running"
    else
        print_error "❌ $service: Not running"
    fi
done

echo ""
echo "🔌 Port Status:"
sudo netstat -tlnp | grep -E ':80|:8000|:8080' || echo "No services found on expected ports"

echo ""
echo "📋 Recent NGINX Error Logs:"
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No NGINX error logs found"

echo ""
echo "📋 Recent Gunicorn Logs:"
sudo journalctl -u gunicorn -n 5 --no-pager 2>/dev/null || echo "No Gunicorn logs found"

echo ""
echo "📁 Frontend Build Status:"
if [ -d "/home/ubuntu/Update2.0_database/client/student-side/dist" ] || [ -d "/home/ubuntu/slms-project/client/student-side/dist" ]; then
    print_status "✅ Student frontend built"
else
    print_error "❌ Student frontend not built"
fi

if [ -d "/home/ubuntu/Update2.0_database/client/admin-side/dist" ] || [ -d "/home/ubuntu/slms-project/client/admin-side/dist" ]; then
    print_status "✅ Admin frontend built"
else
    print_error "❌ Admin frontend not built"
fi

echo ""
echo "🎯 Quick Fix Commands:"
echo "1. Run full fix: chmod +x deploy-scripts/fix-500-error-aws.sh && ./deploy-scripts/fix-500-error-aws.sh"
echo "2. Restart services: sudo systemctl restart gunicorn nginx"
echo "3. Check logs: sudo journalctl -u gunicorn -f"