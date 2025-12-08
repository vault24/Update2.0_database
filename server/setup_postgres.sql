-- PostgreSQL Setup Script for SLMS
-- Run this script as postgres user to set up the database

-- Create database
CREATE DATABASE slms_db;

-- Create user
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';

-- Set user configuration
ALTER ROLE sipi_web SET client_encoding TO 'utf8';
ALTER ROLE sipi_web SET default_transaction_isolation TO 'read committed';
ALTER ROLE sipi_web SET default_transaction_deferrable TO on;
ALTER ROLE sipi_web SET default_transaction_level TO 'read committed';
ALTER ROLE sipi_web SET timezone TO 'UTC';

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE slms_db TO sipi_web;

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

-- Verify setup
SELECT datname FROM pg_database WHERE datname = 'slms_db';
SELECT usename FROM pg_user WHERE usename = 'sipi_web';

-- Display success message
\echo 'PostgreSQL setup completed successfully!'
\echo 'Database: slms_db'
\echo 'User: sipi_web'
\echo 'You can now run: python manage.py migrate'
