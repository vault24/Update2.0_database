#!/bin/bash

# Fix 500 Internal Server Error on AWS Deployment
# Comprehensive troubleshooting and fix script for AWS server

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

print_section "🚨 Fixing 500 Internal Server Error on AWS (47.128.236.25)"

# Determine project directory
if [ -d "/home/ubuntu/Update2.0_database" ]; then
    PROJECT_DIR="/home/ubuntu/Update2.0_database"
elif [ -d "/home/ubuntu/slms-project" ]; then
    PROJECT_DIR="/home/ubuntu/slms-project"
else
    print_error "❌ Project directory not found. Please ensure code is in /home/ubuntu/Update2.0_database or /home/ubuntu/slms-project"
    exit 1
fi

print_status "📁 Using project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

# Step 1: Check and restart services
print_section "🔄 Step 1: Checking and Restarting Services"

print_status "Stopping all services..."
sudo systemctl stop gunicorn 2>/dev/null || echo "Gunicorn not running"
sudo systemctl stop nginx 2>/dev/null || echo "NGINX not running"

print_status "Starting PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

print_status "Checking PostgreSQL status..."
if sudo systemctl is-active --quiet postgresql; then
    print_status "✅ PostgreSQL is running"
else
    print_error "❌ PostgreSQL failed to start"
    sudo systemctl status postgresql --no-pager -l
fi

# Step 2: Fix database permissions
print_section "🔧 Step 2: Fixing Database Permissions"
print_status "Running database permissions fix..."
if [ -f "deploy-scripts/fix-database-permissions.sh" ]; then
    chmod +x deploy-scripts/fix-database-permissions.sh
    ./deploy-scripts/fix-database-permissions.sh
else
    print_warning "Database permissions script not found, running manual fix..."
    sudo -u postgres psql << 'EOF'
\c sipi_db
GRANT USAGE ON SCHEMA public TO sipi_web;
GRANT CREATE ON SCHEMA public TO sipi_web;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sipi_web;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sipi_web;
ALTER DATABASE sipi_db OWNER TO sipi_web;
\q
EOF
fi

# Step 3: Setup Django backend
print_section "🐍 Step 3: Setting up Django Backend"
cd "$PROJECT_DIR/server"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

print_status "Activating virtual environment and installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Check Django configuration
print_status "Checking Django configuration..."
python manage.py check --deploy

# Run migrations
print_status "Running database migrations..."
python manage.py migrate

# Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput

# Test Django
print_status "Testing Django server..."
timeout 10s python manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!
sleep 3
if kill -0 $DJANGO_PID 2>/dev/null; then
    print_status "✅ Django server starts successfully"
    kill $DJANGO_PID 2>/dev/null || true
else
    print_error "❌ Django server failed to start"
fi

# Step 4: Build frontend
print_section "⚛️ Step 4: Building Frontend Applications"
cd "$PROJECT_DIR"

# Build student frontend
print_status "Building student frontend..."
cd client/student-side
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build

if [ ! -d "dist" ]; then
    print_error "❌ Student frontend build failed"
    exit 1
fi
print_status "✅ Student frontend built successfully"

# Build admin frontend
print_status "Building admin frontend..."
cd ../admin-side
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build

if [ ! -d "dist" ]; then
    print_error "❌ Admin frontend build failed"
    exit 1
fi
print_status "✅ Admin frontend built successfully"

# Step 5: Setup Gunicorn service
print_section "🦄 Step 5: Setting up Gunicorn Service"
cd "$PROJECT_DIR"

# Create or update Gunicorn service file
sudo tee /etc/systemd/system/gunicorn.service > /dev/null << EOF
[Unit]
Description=gunicorn daemon for SLMS Django project
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=$PROJECT_DIR/server
Environment="PATH=$PROJECT_DIR/server/venv/bin"
EnvironmentFile=$PROJECT_DIR/server/.env
ExecStart=$PROJECT_DIR/server/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 slms_core.wsgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

print_status "Reloading systemd and starting Gunicorn..."
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
sudo systemctl start gunicorn

# Check Gunicorn status
sleep 3
if sudo systemctl is-active --quiet gunicorn; then
    print_status "✅ Gunicorn is running"
else
    print_error "❌ Gunicorn failed to start"
    sudo journalctl -u gunicorn -n 20 --no-pager
fi

# Step 6: Configure NGINX
print_section "🌐 Step 6: Configuring NGINX"

# Create NGINX configuration
sudo tee /etc/nginx/sites-available/slms > /dev/null << EOF
# Student Frontend (Port 80)
server {
    listen 80;
    server_name 47.128.236.25;
    
    root $PROJECT_DIR/client/student-side/dist;
    index index.html;
    
    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API proxy to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias $PROJECT_DIR/server/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias $PROJECT_DIR/server/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}

# Admin Frontend (Port 8080)
server {
    listen 8080;
    server_name 47.128.236.25;
    
    root $PROJECT_DIR/client/admin-side/dist;
    index index.html;
    
    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API proxy to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias $PROJECT_DIR/server/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias $PROJECT_DIR/server/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/slms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
print_status "Testing NGINX configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    print_status "✅ NGINX configuration is valid"
else
    print_error "❌ NGINX configuration has errors"
    exit 1
fi

# Step 7: Set proper permissions
print_section "🔒 Step 7: Setting File Permissions"
sudo chown -R ubuntu:www-data "$PROJECT_DIR"
sudo chmod -R 755 "$PROJECT_DIR/client/student-side/dist"
sudo chmod -R 755 "$PROJECT_DIR/client/admin-side/dist"
sudo chmod -R 755 "$PROJECT_DIR/server/staticfiles" 2>/dev/null || true

# Step 8: Start services
print_section "🚀 Step 8: Starting All Services"
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# Wait a moment for services to start
sleep 5

# Step 9: Verify deployment
print_section "✅ Step 9: Verifying Deployment"

print_status "Checking service status..."
if sudo systemctl is-active --quiet postgresql; then
    print_status "✅ PostgreSQL: Running"
else
    print_error "❌ PostgreSQL: Not running"
fi

if sudo systemctl is-active --quiet gunicorn; then
    print_status "✅ Gunicorn: Running"
else
    print_error "❌ Gunicorn: Not running"
    sudo journalctl -u gunicorn -n 10 --no-pager
fi

if sudo systemctl is-active --quiet nginx; then
    print_status "✅ NGINX: Running"
else
    print_error "❌ NGINX: Not running"
    sudo systemctl status nginx --no-pager -l
fi

print_status "Checking ports..."
sudo netstat -tlnp | grep -E ':80|:8000|:8080'

print_section "🎉 Deployment Fix Complete!"
print_status "Your applications should now be accessible at:"
echo "  🎓 Student Frontend: http://47.128.236.25"
echo "  👨‍💼 Admin Frontend:   http://47.128.236.25:8080"
echo ""
print_status "If you still see 500 errors, check the logs:"
echo "  • Gunicorn logs: sudo journalctl -u gunicorn -f"
echo "  • NGINX logs: sudo tail -f /var/log/nginx/error.log"
echo "  • Django logs: Check your Django application logs"