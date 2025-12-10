-- Fix PostgreSQL Permissions for Django Migrations
-- This script fixes the "permission denied for schema public" error
-- Run this as the postgres superuser

-- Connect to your database (replace slms_db with your actual database name)
\c slms_db

-- Grant usage and create privileges on the public schema
-- This is required for PostgreSQL 15+ where public schema permissions are restricted
GRANT USAGE ON SCHEMA public TO sipi_web;
GRANT CREATE ON SCHEMA public TO sipi_web;

-- Grant all privileges on the schema
GRANT ALL PRIVILEGES ON SCHEMA public TO sipi_web;

-- Grant privileges on existing tables (if any)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sipi_web;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sipi_web;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sipi_web;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO sipi_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO sipi_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO sipi_web;

-- Make the user the owner of the schema (alternative approach)
-- ALTER SCHEMA public OWNER TO sipi_web;

-- Verify permissions
\echo 'Permissions granted successfully!'
\echo 'You can now run: python manage.py migrate'

