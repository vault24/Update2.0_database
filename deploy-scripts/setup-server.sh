#!/bin/bash

# SLMS AWS Ubuntu Server Setup Script
# Run this script on your AWS Ubuntu server to set up the environment

set -e  # Exit on any error

echo "🚀 Starting SLMS Server Setup..."

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as ubuntu user with sudo privileges."
   exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx curl git

print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

print_status "Verifying installations..."
echo "Python version: $(python3 --version)"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "NGINX version: $(nginx -v 2>&1)"
echo "PostgreSQL version: $(psql --version)"

print_status "Configuring PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
ALTER USER sipi_web CREATEDB;
\q
EOF

print_status "Configuring PostgreSQL authentication..."

# Find the correct PostgreSQL configuration directory
PG_CONFIG_DIR=$(sudo find /etc/postgresql -name "pg_hba.conf" -type f | head -1 | xargs dirname)
PG_CONFIG_PATH="$PG_CONFIG_DIR/pg_hba.conf"

if [ ! -f "$PG_CONFIG_PATH" ]; then
    print_error "Could not find pg_hba.conf file. Please configure PostgreSQL manually."
    print_warning "You may need to add this line to your pg_hba.conf:"
    print_warning "local   all             sipi_web                                md5"
else
    print_status "Found PostgreSQL config at: $PG_CONFIG_PATH"
    
    # Backup original config
    sudo cp "$PG_CONFIG_PATH" "$PG_CONFIG_PATH.backup"
    
    # Add authentication line for sipi_web user if it doesn't exist
    if ! sudo grep -q "sipi_web" "$PG_CONFIG_PATH"; then
        echo "local   all             sipi_web                                md5" | sudo tee -a "$PG_CONFIG_PATH"
        print_status "Added sipi_web authentication to PostgreSQL"
    else
        print_warning "sipi_web authentication already exists in PostgreSQL config"
    fi
fi

print_status "Restarting and enabling PostgreSQL..."
sudo systemctl restart postgresql
sudo systemctl enable postgresql

print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 8080

print_status "Creating project directory..."
mkdir -p /home/ubuntu/slms-project
cd /home/ubuntu/slms-project

print_status "✅ Server setup completed successfully!"
print_warning "Next steps:"
echo "1. Clone your project code to /home/ubuntu/slms-project"
echo "2. Run the deploy-backend.sh script"
echo "3. Run the deploy-frontend.sh script"
echo "4. Configure NGINX using the provided configuration"

print_status "Setup script finished. Check above for any errors."