#!/bin/bash

# SLMS Backend Deployment Script
# Run this script to deploy the Django backend

set -e  # Exit on any error

echo "🚀 Starting Backend Deployment..."

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

# Check if we're in the right directory
if [ ! -d "server" ]; then
    print_error "server directory not found. Please run this script from the project root."
    exit 1
fi

print_status "Navigating to server directory..."
cd server

print_status "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

print_status "Creating production environment file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_warning "Please edit server/.env file with your production settings before continuing!"
    print_warning "Update SECRET_KEY, DEBUG=False, and ALLOWED_HOSTS"
    read -p "Press Enter after editing .env file..."
fi

print_status "Running database migrations..."
python manage.py migrate

print_status "Collecting static files..."
python manage.py collectstatic --noinput

print_status "Testing Django server..."
timeout 5 python manage.py runserver 127.0.0.1:8000 &
SERVER_PID=$!
sleep 2
if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "Django server test successful"
    kill $SERVER_PID
else
    print_error "Django server failed to start"
    exit 1
fi

print_status "Creating Gunicorn service file..."
sudo tee /etc/systemd/system/gunicorn.service > /dev/null << EOF
[Unit]
Description=gunicorn daemon for SLMS
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

print_status "Starting and enabling Gunicorn service..."
sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

# Check if Gunicorn is running
if sudo systemctl is-active --quiet gunicorn; then
    print_status "✅ Gunicorn service is running successfully"
else
    print_error "❌ Gunicorn service failed to start"
    print_error "Check logs with: sudo journalctl -u gunicorn -f"
    exit 1
fi

print_status "Creating superuser (optional)..."
read -p "Do you want to create a Django superuser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser
fi

print_status "✅ Backend deployment completed successfully!"
print_status "Gunicorn is running on 127.0.0.1:8000"
print_warning "Next step: Run deploy-frontend.sh to build and deploy frontend applications"