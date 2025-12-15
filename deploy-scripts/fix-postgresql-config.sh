#!/bin/bash

# Fix PostgreSQL Configuration Script
# Run this to fix the PostgreSQL authentication issue

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

print_status "Fixing PostgreSQL configuration..."

# Find the correct PostgreSQL configuration directory
print_status "Searching for PostgreSQL configuration files..."
PG_CONFIG_PATH=$(sudo find /etc/postgresql -name "pg_hba.conf" -type f 2>/dev/null | head -1)

if [ -z "$PG_CONFIG_PATH" ]; then
    print_error "Could not find pg_hba.conf file."
    print_status "Trying alternative locations..."
    
    # Check common alternative locations
    POSSIBLE_PATHS=(
        "/var/lib/postgresql/data/pg_hba.conf"
        "/usr/local/pgsql/data/pg_hba.conf"
        "/opt/postgresql/data/pg_hba.conf"
    )
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            PG_CONFIG_PATH="$path"
            break
        fi
    done
fi

if [ -z "$PG_CONFIG_PATH" ]; then
    print_error "Could not find pg_hba.conf file in any standard location."
    print_warning "Please manually add this line to your pg_hba.conf file:"
    print_warning "local   all             sipi_web                                md5"
    print_warning ""
    print_warning "You can find your PostgreSQL data directory with:"
    print_warning "sudo -u postgres psql -c 'SHOW data_directory;'"
    exit 1
fi

print_status "Found PostgreSQL config at: $PG_CONFIG_PATH"

# Backup original config
sudo cp "$PG_CONFIG_PATH" "$PG_CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
print_status "Created backup of pg_hba.conf"

# Check if sipi_web user authentication already exists
if sudo grep -q "sipi_web" "$PG_CONFIG_PATH"; then
    print_warning "sipi_web authentication already exists in PostgreSQL config"
else
    # Add authentication line for sipi_web user
    echo "local   all             sipi_web                                md5" | sudo tee -a "$PG_CONFIG_PATH"
    print_status "Added sipi_web authentication to PostgreSQL"
fi

# Restart PostgreSQL to apply changes
print_status "Restarting PostgreSQL service..."
sudo systemctl restart postgresql

# Verify PostgreSQL is running
if sudo systemctl is-active --quiet postgresql; then
    print_status "✅ PostgreSQL is running successfully"
else
    print_error "❌ PostgreSQL failed to start. Check the logs:"
    print_warning "sudo journalctl -u postgresql -n 20"
    exit 1
fi

# Test database connection
print_status "Testing database connection..."
if sudo -u postgres psql -d sipi_db -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "✅ Database connection successful"
else
    print_warning "Database connection test failed. You may need to create the database manually:"
    print_warning "sudo -u postgres createdb sipi_db"
    print_warning "sudo -u postgres createuser sipi_web"
    print_warning "sudo -u postgres psql -c \"ALTER USER sipi_web WITH PASSWORD 'sipiadmin';\""
    print_warning "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;\""
fi

print_status "✅ PostgreSQL configuration fix completed!"