-- Fix PostgreSQL Permissions for SLMS
-- Run this as postgres user to grant proper permissions

-- Connect to the database
\c slms_db

-- Grant schema privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO sipi_web;

-- Grant table privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sipi_web;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sipi_web;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sipi_web;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO sipi_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO sipi_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO sipi_web;

-- Verify permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
LIMIT 10;

\echo 'Permissions fixed successfully!'
