-- Drop existing database and recreate
DROP DATABASE IF EXISTS sipi_db;
CREATE DATABASE sipi_db;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
