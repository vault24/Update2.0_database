#!/bin/bash

# Fix PostgreSQL Database Permissions Script
# Fixes the "permission denied for schema public" error

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

print_status "🔧 Fixing PostgreSQL database permissions..."

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
fi

print_status "Granting necessary permissions to sipi_web user..."

# Connect as postgres superuser and fix permissions
sudo -u postgres psql << 'EOF'
-- Connect to the sipi_db database
\c sipi_db

-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO sipi_web;

-- Grant create privileges on schema public
GRANT CREATE ON SCHEMA public TO sipi_web;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sipi_web;

-- Grant all privileges on all sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sipi_web;

-- Grant all privileges on all functions in public schema
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sipi_web;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sipi_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sipi_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO sipi_web;

-- Make sipi_web owner of the database (alternative approach)
ALTER DATABASE sipi_db OWNER TO sipi_web;

-- Show current permissions
\dp

-- Quit
\q
EOF

print_status "✅ Database permissions fixed!"

# Test the connection
print_status "Testing database connection..."
if PGPASSWORD='sipiadmin' psql -h localhost -U sipi_web -d sipi_db -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "✅ Database connection test successful!"
else
    print_warning "⚠️  Database connection test failed. You may need to check your .env file settings."
fi

print_status "🎉 Permission fix completed! You can now run Django migrations."
print_warning "Next step: Run 'python manage.py migrate' in your Django project."