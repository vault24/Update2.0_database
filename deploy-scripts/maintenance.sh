#!/bin/bash

# SLMS Maintenance Script
# Common maintenance tasks for the deployed SLMS application

set -e

# Configuration
PROJECT_NAME="SLMS"
SERVER_IP="47.128.236.25"
DB_NAME="sipi_db"
DB_USER="sipi_web"

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
    echo "SLMS Maintenance Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status      - Check status of all services"
    echo "  logs        - View service logs"
    echo "  restart     - Restart all services"
    echo "  update      - Update application from git"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore database from backup"
    echo "  superuser   - Create Django superuser"
    echo "  migrate     - Run database migrations"
    echo "  static      - Collect static files"
    echo "  rebuild     - Rebuild frontend applications"
    echo "  clean       - Clean temporary files and logs"
    echo "  monitor     - Real-time monitoring"
    echo ""
}

# Check service status
check_status() {
    print_step "Checking service status..."
    
    services=("postgresql" "gunicorn" "nginx")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            print_status "✅ $service is running"
        else
            print_error "❌ $service is not running"
        fi
    done
    
    # Check ports
    print_step "Checking port availability..."
    ports=("80:NGINX-Student" "8080:NGINX-Admin" "8000:Gunicorn")
    for port_info in "${ports[@]}"; do
        port=$(echo "$port_info" | cut -d':' -f1)
        name=$(echo "$port_info" | cut -d':' -f2)
        
        if sudo netstat -tlnp | grep -q ":$port "; then
            print_status "✅ Port $port ($name) is listening"
        else
            print_warning "⚠️  Port $port ($name) is not listening"
        fi
    done
    
    # Check disk space
    print_step "Checking disk space..."
    df -h / | tail -1 | awk '{print "Disk usage: " $3 "/" $2 " (" $5 " used)"}'
    
    # Check memory
    print_step "Checking memory usage..."
    free -h | grep "Mem:" | awk '{print "Memory usage: " $3 "/" $2}'
}

# View logs
view_logs() {
    echo "Select log to view:"
    echo "1. Gunicorn (Django backend)"
    echo "2. NGINX Error Log"
    echo "3. NGINX Access Log"
    echo "4. PostgreSQL Log"
    echo "5. System Log"
    
    read -p "Enter choice (1-5): " choice
    
    case $choice in
        1) sudo journalctl -u gunicorn -f ;;
        2) sudo tail -f /var/log/nginx/error.log ;;
        3) sudo tail -f /var/log/nginx/access.log ;;
        4) sudo tail -f /var/log/postgresql/postgresql-*.log ;;
        5) sudo journalctl -f ;;
        *) print_error "Invalid choice" ;;
    esac
}

# Restart services
restart_services() {
    print_step "Restarting services..."
    
    services=("gunicorn" "nginx")
    for service in "${services[@]}"; do
        print_status "Restarting $service..."
        sudo systemctl restart "$service"
        
        if sudo systemctl is-active --quiet "$service"; then
            print_status "✅ $service restarted successfully"
        else
            print_error "❌ Failed to restart $service"
        fi
    done
}

# Update application
update_application() {
    print_step "Updating application from git..."
    
    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Backup current state
    print_status "Creating backup before update..."
    backup_database
    
    # Pull latest changes
    print_status "Pulling latest changes..."
    git pull origin main
    
    # Update backend
    print_status "Updating backend..."
    cd server
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py collectstatic --noinput
    cd ..
    
    # Update frontend
    print_status "Rebuilding frontend..."
    rebuild_frontend
    
    # Restart services
    restart_services
    
    print_status "✅ Application updated successfully"
}

# Database backup
backup_database() {
    print_step "Creating database backup..."
    
    BACKUP_DIR="$HOME/slms_backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/slms_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump -U "$DB_USER" -h localhost "$DB_NAME" > "$BACKUP_FILE"; then
        print_status "✅ Database backup created: $BACKUP_FILE"
        
        # Keep only last 10 backups
        ls -t "$BACKUP_DIR"/slms_backup_*.sql | tail -n +11 | xargs -r rm
        print_status "Old backups cleaned up (keeping last 10)"
    else
        print_error "❌ Database backup failed"
        exit 1
    fi
}

# Database restore
restore_database() {
    print_step "Restoring database from backup..."
    
    BACKUP_DIR="$HOME/slms_backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    # List available backups
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/slms_backup_*.sql 2>/dev/null || {
        print_error "No backup files found"
        exit 1
    }
    
    read -p "Enter backup filename: " backup_file
    
    if [ ! -f "$BACKUP_DIR/$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will overwrite the current database. Are you sure?"
    read -p "Type 'yes' to continue: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    # Stop services
    sudo systemctl stop gunicorn
    
    # Restore database
    if psql -U "$DB_USER" -h localhost "$DB_NAME" < "$BACKUP_DIR/$backup_file"; then
        print_status "✅ Database restored successfully"
    else
        print_error "❌ Database restore failed"
        exit 1
    fi
    
    # Start services
    sudo systemctl start gunicorn
    
    print_status "✅ Database restore completed"
}

# Create superuser
create_superuser() {
    print_step "Creating Django superuser..."
    
    cd server
    source venv/bin/activate
    python manage.py createsuperuser
    cd ..
    
    print_status "✅ Superuser created"
}

# Run migrations
run_migrations() {
    print_step "Running database migrations..."
    
    cd server
    source venv/bin/activate
    python manage.py migrate
    cd ..
    
    print_status "✅ Migrations completed"
}

# Collect static files
collect_static() {
    print_step "Collecting static files..."
    
    cd server
    source venv/bin/activate
    python manage.py collectstatic --noinput
    cd ..
    
    # Set permissions
    sudo chmod -R 755 server/staticfiles/
    
    print_status "✅ Static files collected"
}

# Rebuild frontend
rebuild_frontend() {
    print_step "Rebuilding frontend applications..."
    
    # Admin frontend
    print_status "Rebuilding admin frontend..."
    cd client/admin-side
    npm install
    npm run build
    cd ../..
    
    # Student frontend
    print_status "Rebuilding student frontend..."
    cd client/student-side
    npm install
    npm run build
    cd ../..
    
    # Set permissions
    sudo chown -R ubuntu:www-data client/
    sudo chmod -R 755 client/admin-side/dist/
    sudo chmod -R 755 client/student-side/dist/
    
    print_status "✅ Frontend rebuild completed"
}

# Clean temporary files
clean_system() {
    print_step "Cleaning temporary files and logs..."
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Clean pip cache
    cd server
    source venv/bin/activate
    pip cache purge 2>/dev/null || true
    cd ..
    
    # Clean old log files (keep last 7 days)
    sudo find /var/log -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Clean temporary files
    sudo rm -rf /tmp/slms_* 2>/dev/null || true
    
    print_status "✅ System cleaned"
}

# Real-time monitoring
monitor_system() {
    print_step "Starting real-time monitoring (Press Ctrl+C to exit)..."
    
    while true; do
        clear
        echo "=== SLMS System Monitor ==="
        echo "Time: $(date)"
        echo ""
        
        # Service status
        echo "Services:"
        services=("postgresql" "gunicorn" "nginx")
        for service in "${services[@]}"; do
            if sudo systemctl is-active --quiet "$service"; then
                echo "  ✅ $service"
            else
                echo "  ❌ $service"
            fi
        done
        
        echo ""
        
        # System resources
        echo "System Resources:"
        echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% used"
        echo "  Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
        echo "  Disk: $(df / | tail -1 | awk '{print $5}')"
        
        echo ""
        
        # Recent log entries
        echo "Recent Errors (last 5 minutes):"
        sudo journalctl -u gunicorn --since "5 minutes ago" --no-pager -q | tail -3 || echo "  No recent errors"
        
        sleep 5
    done
}

# Main function
main() {
    case "${1:-}" in
        "status")
            check_status
            ;;
        "logs")
            view_logs
            ;;
        "restart")
            restart_services
            ;;
        "update")
            update_application
            ;;
        "backup")
            backup_database
            ;;
        "restore")
            restore_database
            ;;
        "superuser")
            create_superuser
            ;;
        "migrate")
            run_migrations
            ;;
        "static")
            collect_static
            ;;
        "rebuild")
            rebuild_frontend
            ;;
        "clean")
            clean_system
            ;;
        "monitor")
            monitor_system
            ;;
        *)
            show_usage
            ;;
    esac
}

# Check if running from project root
if [ ! -f "deploy-scripts/maintenance.sh" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Run main function
main "$@"