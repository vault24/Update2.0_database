#!/bin/bash

# SLMS Troubleshooting Script
# Automated diagnosis and fixes for common deployment issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Show usage
show_usage() {
    echo "SLMS Troubleshooting Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  diagnose    - Run full system diagnosis"
    echo "  fix-502     - Fix 502 Bad Gateway errors"
    echo "  fix-cors    - Fix CORS issues"
    echo "  fix-perms   - Fix file permissions"
    echo "  fix-db      - Fix database connection issues"
    echo "  fix-static  - Fix static file serving issues"
    echo "  reset-nginx - Reset NGINX configuration"
    echo "  reset-all   - Reset all services (nuclear option)"
    echo ""
}

# Full system diagnosis
diagnose_system() {
    print_step "Running full system diagnosis..."
    
    echo "=== SLMS System Diagnosis Report ==="
    echo "Generated: $(date)"
    echo ""
    
    # Check services
    print_step "Checking services..."
    services=("postgresql" "gunicorn" "nginx")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            print_status "✅ $service is running"
        else
            print_error "❌ $service is not running"
            echo "   Status: $(sudo systemctl is-active $service)"
            echo "   Last error: $(sudo journalctl -u $service --no-pager -l -n 1)"
        fi
    done
    
    # Check ports
    print_step "Checking network ports..."
    ports=("80:NGINX-Student" "8080:NGINX-Admin" "8000:Gunicorn" "5432:PostgreSQL")
    for port_info in "${ports[@]}"; do
        port=$(echo "$port_info" | cut -d':' -f1)
        name=$(echo "$port_info" | cut -d':' -f2)
        
        if sudo netstat -tlnp | grep -q ":$port "; then
            print_status "✅ Port $port ($name) is listening"
        else
            print_warning "⚠️  Port $port ($name) is not listening"
        fi
    done
    
    # Check file permissions
    print_step "Checking file permissions..."
    check_permissions
    
    # Check disk space
    print_step "Checking disk space..."
    df -h / | tail -1 | awk '{
        if ($5+0 > 90) 
            print "❌ Disk usage critical: " $5 " used"
        else if ($5+0 > 80) 
            print "⚠️  Disk usage high: " $5 " used"
        else 
            print "✅ Disk usage normal: " $5 " used"
    }'
    
    # Check memory
    print_step "Checking memory usage..."
    free | grep Mem | awk '{
        usage = $3/$2 * 100
        if (usage > 90) 
            print "❌ Memory usage critical: " usage "%"
        else if (usage > 80) 
            print "⚠️  Memory usage high: " usage "%"
        else 
            print "✅ Memory usage normal: " usage "%"
    }'
    
    # Check database connection
    print_step "Checking database connection..."
    check_database_connection
    
    # Check NGINX configuration
    print_step "Checking NGINX configuration..."
    if sudo nginx -t &>/dev/null; then
        print_status "✅ NGINX configuration is valid"
    else
        print_error "❌ NGINX configuration has errors"
        sudo nginx -t
    fi
    
    # Check recent errors
    print_step "Checking recent errors..."
    echo "Recent Gunicorn errors:"
    sudo journalctl -u gunicorn --since "1 hour ago" --no-pager -q | grep -i error | tail -5 || echo "No recent errors"
    
    echo ""
    echo "Recent NGINX errors:"
    sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No recent errors"
    
    print_status "Diagnosis completed"
}

# Check file permissions
check_permissions() {
    # Check project directory ownership
    if [ "$(stat -c %U .)" != "ubuntu" ]; then
        print_warning "Project directory not owned by ubuntu user"
    else
        print_status "✅ Project directory ownership correct"
    fi
    
    # Check static files
    if [ -d "server/staticfiles" ]; then
        if [ "$(stat -c %a server/staticfiles)" -ge "755" ]; then
            print_status "✅ Static files permissions correct"
        else
            print_warning "Static files permissions may be incorrect"
        fi
    fi
    
    # Check frontend dist directories
    for frontend in "client/admin-side/dist" "client/student-side/dist"; do
        if [ -d "$frontend" ]; then
            if [ "$(stat -c %a $frontend)" -ge "755" ]; then
                print_status "✅ $frontend permissions correct"
            else
                print_warning "$frontend permissions may be incorrect"
            fi
        fi
    done
}

# Check database connection
check_database_connection() {
    cd server
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        if python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()
from django.db import connection
connection.ensure_connection()
print('Database connection successful')
" 2>/dev/null; then
            print_status "✅ Database connection working"
        else
            print_error "❌ Database connection failed"
        fi
    else
        print_warning "Virtual environment not found"
    fi
    cd ..
}

# Fix 502 Bad Gateway errors
fix_502_error() {
    print_step "Fixing 502 Bad Gateway errors..."
    
    # Check if Gunicorn is running
    if ! sudo systemctl is-active --quiet gunicorn; then
        print_status "Starting Gunicorn service..."
        sudo systemctl start gunicorn
    fi
    
    # Restart Gunicorn
    print_status "Restarting Gunicorn..."
    sudo systemctl restart gunicorn
    
    # Check Gunicorn status
    sleep 2
    if sudo systemctl is-active --quiet gunicorn; then
        print_status "✅ Gunicorn is running"
    else
        print_error "❌ Gunicorn failed to start"
        print_status "Checking Gunicorn logs..."
        sudo journalctl -u gunicorn --no-pager -l -n 10
        return 1
    fi
    
    # Restart NGINX
    print_status "Restarting NGINX..."
    sudo systemctl restart nginx
    
    # Test the fix
    sleep 2
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/ | grep -q "200\|404"; then
        print_status "✅ 502 error fixed"
    else
        print_warning "502 error may still exist"
    fi
}

# Fix CORS issues
fix_cors_issues() {
    print_step "Fixing CORS issues..."
    
    # Check Django CORS settings
    cd server
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        
        # Install django-cors-headers if not installed
        if ! pip list | grep -q django-cors-headers; then
            print_status "Installing django-cors-headers..."
            pip install django-cors-headers
        fi
        
        # Check if CORS is configured in settings
        if ! grep -q "corsheaders" slms_core/settings.py; then
            print_status "Adding CORS configuration to Django settings..."
            
            # Backup settings
            cp slms_core/settings.py slms_core/settings.py.backup
            
            # Add CORS configuration
            cat >> slms_core/settings.py << 'EOF'

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://47.128.236.25",
    "http://47.128.236.25:8080",
    "http://localhost:3000",
    "http://localhost:5173",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
EOF
            
            # Add corsheaders to INSTALLED_APPS if not present
            if ! grep -q "corsheaders" slms_core/settings.py; then
                sed -i "/INSTALLED_APPS = \[/a\\    'corsheaders'," slms_core/settings.py
            fi
            
            # Add corsheaders middleware if not present
            if ! grep -q "corsheaders.middleware.CorsMiddleware" slms_core/settings.py; then
                sed -i "/MIDDLEWARE = \[/a\\    'corsheaders.middleware.CorsMiddleware'," slms_core/settings.py
            fi
        fi
    fi
    cd ..
    
    # Restart services
    sudo systemctl restart gunicorn
    sudo systemctl restart nginx
    
    print_status "✅ CORS configuration updated"
}

# Fix file permissions
fix_permissions() {
    print_step "Fixing file permissions..."
    
    # Fix project directory ownership
    sudo chown -R ubuntu:ubuntu .
    
    # Fix static files permissions
    if [ -d "server/staticfiles" ]; then
        sudo chmod -R 755 server/staticfiles/
        print_status "Fixed static files permissions"
    fi
    
    # Fix frontend dist permissions
    for frontend in "client/admin-side/dist" "client/student-side/dist"; do
        if [ -d "$frontend" ]; then
            sudo chmod -R 755 "$frontend"
            print_status "Fixed $frontend permissions"
        fi
    done
    
    # Fix server directory permissions for www-data
    sudo chown -R ubuntu:www-data server/
    sudo chmod -R 755 server/
    
    # Fix client directory permissions for www-data
    sudo chown -R ubuntu:www-data client/
    sudo chmod -R 755 client/
    
    print_status "✅ File permissions fixed"
}

# Fix database issues
fix_database_issues() {
    print_step "Fixing database connection issues..."
    
    # Restart PostgreSQL
    print_status "Restarting PostgreSQL..."
    sudo systemctl restart postgresql
    
    # Check PostgreSQL status
    if sudo systemctl is-active --quiet postgresql; then
        print_status "✅ PostgreSQL is running"
    else
        print_error "❌ PostgreSQL failed to start"
        return 1
    fi
    
    # Test database connection
    cd server
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        
        # Run migrations
        print_status "Running database migrations..."
        python manage.py migrate
        
        print_status "✅ Database issues fixed"
    fi
    cd ..
}

# Fix static file serving
fix_static_files() {
    print_step "Fixing static file serving issues..."
    
    cd server
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        
        # Collect static files
        print_status "Collecting static files..."
        python manage.py collectstatic --noinput
        
        # Fix permissions
        sudo chmod -R 755 staticfiles/
        sudo chown -R ubuntu:www-data staticfiles/
        
        print_status "✅ Static files fixed"
    fi
    cd ..
    
    # Restart NGINX
    sudo systemctl restart nginx
}

# Reset NGINX configuration
reset_nginx() {
    print_step "Resetting NGINX configuration..."
    
    # Backup current config
    if [ -f "/etc/nginx/sites-available/slms" ]; then
        sudo cp /etc/nginx/sites-available/slms /etc/nginx/sites-available/slms.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Remove current config
    sudo rm -f /etc/nginx/sites-enabled/slms
    sudo rm -f /etc/nginx/sites-available/slms
    
    # Recreate configuration
    print_status "Recreating NGINX configuration..."
    ./deploy-scripts/configure-nginx.sh
    
    print_status "✅ NGINX configuration reset"
}

# Nuclear option - reset everything
reset_all() {
    print_warning "This will reset all services and configurations!"
    read -p "Are you sure? Type 'yes' to continue: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Reset cancelled"
        return 0
    fi
    
    print_step "Resetting all services..."
    
    # Stop all services
    sudo systemctl stop nginx gunicorn
    
    # Fix permissions
    fix_permissions
    
    # Reset database
    cd server
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        python manage.py migrate
        python manage.py collectstatic --noinput
    fi
    cd ..
    
    # Reset NGINX
    reset_nginx
    
    # Restart all services
    sudo systemctl start gunicorn nginx
    
    print_status "✅ All services reset"
}

# Main function
main() {
    case "${1:-}" in
        "diagnose")
            diagnose_system
            ;;
        "fix-502")
            fix_502_error
            ;;
        "fix-cors")
            fix_cors_issues
            ;;
        "fix-perms")
            fix_permissions
            ;;
        "fix-db")
            fix_database_issues
            ;;
        "fix-static")
            fix_static_files
            ;;
        "reset-nginx")
            reset_nginx
            ;;
        "reset-all")
            reset_all
            ;;
        *)
            show_usage
            ;;
    esac
}

# Check if running from project root
if [ ! -f "deploy-scripts/troubleshoot.sh" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Run main function
main "$@"