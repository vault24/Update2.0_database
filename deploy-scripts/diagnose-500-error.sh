#!/bin/bash

# Diagnose 500 Internal Server Error Script
# Checks all services and logs to identify the root cause

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

print_section "🔍 Diagnosing 500 Internal Server Error..."

# Check service status
print_section "📊 Checking Service Status"
echo "NGINX Status:"
sudo systemctl status nginx --no-pager -l || echo "NGINX service check failed"
echo ""

echo "Gunicorn Status:"
sudo systemctl status gunicorn --no-pager -l || echo "Gunicorn service check failed"
echo ""

echo "PostgreSQL Status:"
sudo systemctl status postgresql --no-pager -l || echo "PostgreSQL service check failed"
echo ""

# Check if services are running
print_section "🔄 Service Running Status"
if sudo systemctl is-active --quiet nginx; then
    print_status "✅ NGINX is running"
else
    print_error "❌ NGINX is not running"
fi

if sudo systemctl is-active --quiet gunicorn; then
    print_status "✅ Gunicorn is running"
else
    print_error "❌ Gunicorn is not running"
fi

if sudo systemctl is-active --quiet postgresql; then
    print_status "✅ PostgreSQL is running"
else
    print_error "❌ PostgreSQL is not running"
fi

# Check NGINX logs
print_section "📋 NGINX Error Logs (Last 20 lines)"
sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No NGINX error log found"
echo ""

print_section "📋 NGINX Access Logs (Last 10 lines)"
sudo tail -10 /var/log/nginx/access.log 2>/dev/null || echo "No NGINX access log found"
echo ""

# Check Gunicorn logs
print_section "📋 Gunicorn Logs (Last 30 lines)"
sudo journalctl -u gunicorn -n 30 --no-pager || echo "No Gunicorn logs found"
echo ""

# Check NGINX configuration
print_section "🔧 NGINX Configuration Check"
sudo nginx -t || echo "NGINX configuration test failed"
echo ""

# Check if frontend files exist
print_section "📁 Frontend Files Check"
if [ -d "/home/ubuntu/slms-project/client/student-side/dist" ]; then
    print_status "✅ Student frontend dist folder exists"
    ls -la /home/ubuntu/slms-project/client/student-side/dist/ | head -5
else
    print_error "❌ Student frontend dist folder missing"
fi

if [ -d "/home/ubuntu/slms-project/client/admin-side/dist" ]; then
    print_status "✅ Admin frontend dist folder exists"
    ls -la /home/ubuntu/slms-project/client/admin-side/dist/ | head -5
else
    print_error "❌ Admin frontend dist folder missing"
fi

# Check Django backend
print_section "🐍 Django Backend Check"
cd /home/ubuntu/slms-project/server 2>/dev/null || cd /home/ubuntu/Update2.0_database/server 2>/dev/null || {
    print_error "❌ Server directory not found"
    exit 1
}

if [ -f "manage.py" ]; then
    print_status "✅ Django manage.py found"
    
    # Check if virtual environment exists
    if [ -d "venv" ]; then
        print_status "✅ Virtual environment exists"
        
        # Test Django configuration
        print_status "Testing Django configuration..."
        source venv/bin/activate
        python manage.py check --deploy 2>&1 || echo "Django check failed"
        
        # Test database connection
        print_status "Testing database connection..."
        python manage.py showmigrations 2>&1 | head -10 || echo "Database connection test failed"
        
    else
        print_error "❌ Virtual environment missing"
    fi
else
    print_error "❌ Django manage.py not found"
fi

# Check ports
print_section "🔌 Port Status Check"
print_status "Checking if ports are in use:"
sudo netstat -tlnp | grep -E ':80|:8000|:8080' || echo "No services found on expected ports"

# Check NGINX sites configuration
print_section "🌐 NGINX Sites Configuration"
if [ -f "/etc/nginx/sites-enabled/slms" ]; then
    print_status "✅ NGINX SLMS site is enabled"
    echo "Configuration preview:"
    head -20 /etc/nginx/sites-enabled/slms
else
    print_error "❌ NGINX SLMS site not enabled"
    echo "Available sites:"
    ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "No sites available"
    echo "Enabled sites:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "No sites enabled"
fi

# Check file permissions
print_section "🔒 File Permissions Check"
if [ -d "/home/ubuntu/slms-project" ]; then
    PROJECT_DIR="/home/ubuntu/slms-project"
elif [ -d "/home/ubuntu/Update2.0_database" ]; then
    PROJECT_DIR="/home/ubuntu/Update2.0_database"
else
    print_error "❌ Project directory not found"
    exit 1
fi

print_status "Project directory: $PROJECT_DIR"
ls -la "$PROJECT_DIR" | head -10

print_section "🎯 Quick Fix Recommendations"
echo "Based on common 500 error causes:"
echo "1. Restart services: sudo systemctl restart gunicorn nginx"
echo "2. Check if frontend is built: cd client/student-side && npm run build"
echo "3. Run database migrations: cd server && python manage.py migrate"
echo "4. Check Django settings: Ensure DEBUG=False and ALLOWED_HOSTS includes your IP"
echo "5. Collect static files: cd server && python manage.py collectstatic --noinput"

print_section "🔧 Diagnosis Complete"
print_status "Check the logs above to identify the specific issue."
print_status "Most common causes: Gunicorn not running, frontend not built, or database connection issues."