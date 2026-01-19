# Local Development Setup Guide

This guide will help you set up the SLMS project for local development and testing.

## Prerequisites

1. **Python 3.8+** with pip
2. **Node.js 16+** with npm/yarn
3. **PostgreSQL** database
4. **Redis** (for WebSocket support)

## Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create database and user**:
   ```sql
   CREATE DATABASE sipi_db;
   CREATE USER postgres WITH PASSWORD 'your_password_here';
   GRANT ALL PRIVILEGES ON DATABASE sipi_db TO postgres;
   ```

3. **Update server/.env** with your database credentials:
   ```env
   DB_NAME=sipi_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   DB_HOST=localhost
   DB_PORT=5432
   ```

## Backend Setup (Django)

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser** (optional):
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server**:
   ```bash
   python manage.py runserver
   ```

   The API will be available at: `http://localhost:8000/api/`

## Frontend Setup

### Admin Panel

1. **Navigate to admin-side directory**:
   ```bash
   cd client/admin-side
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The admin panel will be available at: `http://localhost:5173/`

### Student Portal

1. **Navigate to student-side directory**:
   ```bash
   cd client/student-side
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The student portal will be available at: `http://localhost:5174/`

## Redis Setup (Optional - for WebSocket features)

1. **Install Redis**:
   - **Ubuntu/Debian**: `sudo apt install redis-server`
   - **macOS**: `brew install redis`
   - **Windows**: Download from Redis website

2. **Start Redis server**:
   ```bash
   redis-server
   ```

## Environment Configuration

All environment files are already configured for localhost development:

- **Root .env**: `VITE_API_BASE_URL=http://localhost:8000/api`
- **Admin .env**: `VITE_API_BASE_URL=http://localhost:8000/api`
- **Student .env**: `VITE_API_BASE_URL=http://localhost:8000/api`
- **Server .env**: Database and Django settings for localhost

## Testing the Setup

1. **Backend API**: Visit `http://localhost:8000/api/` - should show API root
2. **Admin Panel**: Visit `http://localhost:5173/` - should load admin interface
3. **Student Portal**: Visit `http://localhost:5174/` - should load student interface

## Common Issues

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `server/.env`
- Verify database exists and user has permissions

### CORS Issues
- Ensure Django settings allow localhost origins
- Check that frontend is using correct API URL

### Port Conflicts
- Django: Default port 8000
- Admin frontend: Default port 5173 (Vite)
- Student frontend: Default port 5174 (Vite)

## Switching Back to Production

To switch back to production configuration:

1. **Update environment files**:
   ```bash
   # In .env, client/admin-side/.env, client/student-side/.env
   VITE_API_BASE_URL=http://47.128.236.25/api
   ```

2. **Update Django settings** in `server/slms_core/settings.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://47.128.236.25",
       "http://47.128.236.25:8080",
   ]
   
   CSRF_TRUSTED_ORIGINS = [
       "http://47.128.236.25",
       "http://47.128.236.25:8080",
   ]
   ```

3. **Update API config files** to use production URL as default.

## Development Workflow

1. **Start backend**: `cd server && python manage.py runserver`
2. **Start admin frontend**: `cd client/admin-side && npm run dev`
3. **Start student frontend**: `cd client/student-side && npm run dev`
4. **Access applications**:
   - API: http://localhost:8000/api/
   - Admin: http://localhost:5173/
   - Student: http://localhost:5174/

Happy coding! 🚀