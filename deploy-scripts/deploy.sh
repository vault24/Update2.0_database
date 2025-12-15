#!/bin/bash

# SLMS Complete Deployment Script
# Single script to deploy the entire SLMS application on AWS Ubuntu

set -e  # Exit on any error

# Configuration
PROJECT_NAME="SLMS"
SERVER_IP="47.128.236.25"
DB_NAME="sipi_db"
DB_USER="sipi_web"
DB_PASSWORD="sipiadmin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="/tmp/slms_deploy_$(date +%Y%m%d_%H%M%S).log"

# Functions
print_status() { echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1" | tee -a "$LOG_FILE"; }

# Error handling
handle_error() {
    print_error "Deployment failed at line $1"
    print_error "Check log file: $LOG_FILE"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Pre-flight checks
preflight_checks() {
    print_step "Running pre-flight checks..."
    
    # Check if running as ubuntu user
    if [ "$USER" != "ubuntu" ]; then
        print_error "This script should be run as the ubuntu user"
        exit 1
    fi
    
    # Check if we're in the project directory
    if [ ! -f "deploy-scripts/deploy.sh" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Check required directories
    for dir in "server" "client/admin-side" "client/student-side"; do
        if [ ! -d "$dir" ]; then
            print_error "Required directory not found: $dir"
            exit 1
        fi
    done
    
    print_status "✅ Pre-flight checks passed"
}

# System setup
setup_system() {
    print_step "Setting up system environment..."
    
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    
    print_status "Installing required packages..."
    sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx curl git
    
    print_status "Installing Node.js 18..."
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | cut -d'v' -f2)" -lt "18" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    print_status "Verifying installations..."
    echo "Python: $(python3 --version)" | tee -a "$LOG_FILE"
    echo "Node.js: $(node --version)" | tee -a "$LOG_FILE"
    echo "NPM: $(npm --version)" | tee -a "$LOG_FILE"
    echo "PostgreSQL: $(psql --version)" | tee -a "$LOG_FILE"
    
    print_status "✅ System setup completed"
}

# Database setup
setup_database() {
    print_step "Setting up PostgreSQL database..."
    
    # Check if database already exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database $DB_NAME already exists, skipping creation"
    else
        print_status "Creating database and user..."
        sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    fi
    
    # Configure PostgreSQL authentication
    PG_CONFIG_DIR=$(sudo find /etc/postgresql -name "pg_hba.conf" -type f | head -1 | xargs dirname)
    PG_CONFIG_PATH="$PG_CONFIG_DIR/pg_hba.conf"
    
    if [ -f "$PG_CONFIG_PATH" ]; then
        sudo cp "$PG_CONFIG_PATH" "$PG_CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
        
        if ! sudo grep -q "$DB_USER" "$PG_CONFIG_PATH"; then
            echo "local   all             $DB_USER                                md5" | sudo tee -a "$PG_CONFIG_PATH"
            print_status "Added $DB_USER authentication to PostgreSQL"
        fi
    fi
    
    sudo systemctl restart postgresql
    sudo systemctl enable postgresql
    
    print_status "✅ Database setup completed"
}

# Backend deployment
deploy_backend() {
    print_step "Deploying Django backend..."
    
    cd server
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    print_status "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn
    
    # Create production environment file
    if [ ! -f ".env" ]; then
        print_status "Creating production environment file..."
        cp .env.example .env
        
        # Update .env with production settings
        sed -i "s/DEBUG=True/DEBUG=False/" .env
        sed -i "s/ALLOWED_HOSTS=.*/ALLOWED_HOSTS=$SERVER_IP,localhost,127.0.0.1/" .env
        
        print_warning "Please review and update server/.env file with your production settings"
    fi
    
    print_status "Running database migrations..."
    python manage.py migrate
    
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput
    
    # Create Gunicorn service
    print_status "Creating Gunicorn service..."
    sudo tee /etc/systemd/system/gunicorn.service > /dev/null << EOF
[Unit]
Description=gunicorn daemon for $PROJECT_NAME
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/venv/bin/gunicorn \\
          --access-logfile - \\
          --workers 3 \\
          --bind 127.0.0.1:8000 \\
          slms_core.wsgi:application

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl start gunicorn
    sudo systemctl enable gunicorn
    
    # Verify Gunicorn is running
    if sudo systemctl is-active --quiet gunicorn; then
        print_status "✅ Gunicorn service is running"
    else
        print_error "Gunicorn service failed to start"
        sudo journalctl -u gunicorn --no-pager -l
        exit 1
    fi
    
    cd ..
    print_status "✅ Backend deployment completed"
}

# Frontend deployment
deploy_frontend() {
    print_step "Building and deploying frontend applications..."
    
    # Admin Frontend
    print_status "Building admin frontend..."
    cd client/admin-side
    
    cat > .env << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
EOF
    
    npm install
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Admin frontend build failed"
        exit 1
    fi
    
    # Student Frontend
    print_status "Building student frontend..."
    cd ../student-side
    
    cat > .env << EOF
VITE_API_BASE_URL=http://$SERVER_IP/api
EOF
    
    npm install
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Student frontend build failed"
        exit 1
    fi
    
    cd ../..
    
    # Set permissions
    print_status "Setting proper permissions..."
    sudo chown -R ubuntu:www-data client/
    sudo chmod -R 755 client/admin-side/dist/
    sudo chmod -R 755 client/student-side/dist/
    sudo chmod -R 755 server/staticfiles/ 2>/dev/null || true
    
    print_status "✅ Frontend deployment completed"
}

# NGINX configuration
configure_nginx() {
    print_step "Configuring NGINX..."
    
    PROJECT_DIR=$(pwd)
    
    print_status "Creating NGINX configuration..."
    sudo tee /etc/nginx/sites-available/slms > /dev/null << EOF
# Student Frontend (Port 80)
server {
    listen 80;
    server_name $SERVER_IP;
    
    root $PROJECT_DIR/client/student-side/dist;
    index index.html;
    
    # Handle SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Serve static files
    location /static/ {
        alias $PROJECT_DIR/server/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Serve media files
    location /media/ {
        alias $PROJECT_DIR/server/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080;
    server_name $SERVER_IP;
    
    root $PROJECT_DIR/client/admin-side/dist;
    index index.html;
    
    # Handle SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Serve static files
    location /static/ {
        alias $PROJECT_DIR/server/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Serve media files
    location /media/ {
        alias $PROJECT_DIR/server/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/slms /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart NGINX
    if sudo nginx -t; then
        print_status "NGINX configuration test passed"
        sudo systemctl restart nginx
        sudo systemctl enable nginx
    else
        print_error "NGINX configuration test failed"
        exit 1
    fi
    
    print_status "✅ NGINX configuration completed"
}

# Firewall setup
setup_firewall() {
    print_step "Configuring firewall..."
    
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 8080
    
    print_status "✅ Firewall configured"
}

# Post-deployment verification
verify_deployment() {
    print_step "Verifying deployment..."
    
    # Check services
    services=("postgresql" "gunicorn" "nginx")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            print_status "✅ $service is running"
        else
            print_error "❌ $service is not running"
        fi
    done
    
    # Check ports
    ports=("80" "8080" "8000")
    for port in "${ports[@]}"; do
        if sudo netstat -tlnp | grep -q ":$port "; then
            print_status "✅ Port $port is listening"
        else
            print_warning "⚠️  Port $port is not listening"
        fi
    done
    
    print_status "✅ Deployment verification completed"
}

# Main deployment function
main() {
    echo "🚀 Starting $PROJECT_NAME Complete Deployment..."
    echo "Log file: $LOG_FILE"
    
    preflight_checks
    setup_system
    setup_database
    deploy_backend
    deploy_frontend
    configure_nginx
    setup_firewall
    verify_deployment
    
    echo ""
    echo "=========================================="
    echo "🎯 DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "✅ Server environment configured"
    echo "✅ PostgreSQL database set up"
    echo "✅ Django backend deployed with Gunicorn"
    echo "✅ Frontend applications built and deployed"
    echo "✅ NGINX configured and running"
    echo "✅ Firewall configured"
    echo ""
    echo "🌐 Your applications are now accessible at:"
    echo "   📱 Student Frontend: http://$SERVER_IP"
    echo "   🏢 Admin Frontend:   http://$SERVER_IP:8080"
    echo "   🔧 API Endpoint:     http://$SERVER_IP/api/"
    echo ""
    echo "📋 Service Management:"
    echo "   sudo systemctl status gunicorn"
    echo "   sudo systemctl status nginx"
    echo "   sudo systemctl status postgresql"
    echo ""
    echo "📋 View Logs:"
    echo "   sudo journalctl -u gunicorn -f"
    echo "   sudo tail -f /var/log/nginx/error.log"
    echo "   Deployment log: $LOG_FILE"
    echo ""
    print_warning "Post-deployment tasks:"
    echo "1. Create Django superuser: cd server && source venv/bin/activate && python manage.py createsuperuser"
    echo "2. Update Django SECRET_KEY in server/.env"
    echo "3. Configure AWS Security Group for ports 80 and 8080"
    echo "4. Set up regular database backups"
    echo ""
    print_status "🎉 Deployment completed successfully!"
}

# Run main function
main "$@"