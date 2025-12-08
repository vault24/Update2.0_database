# SLMS Django Backend

Django REST API backend for the Student Learning Management System (SLMS).

## Features

- **PostgreSQL Database**: Robust data persistence
- **RESTful API**: Complete CRUD operations for all entities
- **File Management**: Uploads stored in `client/assets/images/`
- **CORS Enabled**: Frontend can communicate with backend
- **Comprehensive Validation**: Data integrity and error handling
- **Property-Based Testing**: Using Hypothesis for reliability

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 14 or higher
- pip (Python package manager)

## Setup Instructions

### 1. Install PostgreSQL

Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)

### 2. Create Database

Open PostgreSQL command line (psql) or pgAdmin and create the database:

```sql
CREATE DATABASE slms_db;
CREATE USER slms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE slms_db TO slms_user;
```

### 3. Set Up Python Environment

```bash
# Navigate to server directory
cd server

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# Database Configuration
DB_NAME=slms_db
DB_USER=slms_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500
```

### 5. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Initialize Data

#### For Production Environments

**⚠️ IMPORTANT: Never use sample data scripts in production!**

For production deployment, you should:

1. **Import Real Data**: Migrate data from the Sadhu PostgreSQL database
   ```bash
   # Use Django's data migration tools
   python manage.py loaddata production_data.json
   ```

2. **Seed Required System Data**: Only seed essential system data like departments
   ```bash
   python manage.py seed_departments
   ```

3. **Manual Data Entry**: Use the admin interface or API to add real institutional data

#### For Development/Testing Environments Only

**⚠️ WARNING: The sample data script has been disabled to prevent accidental use in production.**

If you need sample data for development:

1. **Enable the script** (development only):
   ```bash
   # Rename the disabled file
   mv create_sample_data.py.disabled create_sample_data.py
   ```

2. **Run the script**:
   ```bash
   python create_sample_data.py
   ```

3. **Disable it again** after use:
   ```bash
   mv create_sample_data.py create_sample_data.py.disabled
   ```

**Alternative**: Use Django management commands for controlled sample data:
```bash
python manage.py generate_sample_data --students 20 --applications 10
```

#### Data Migration Guide

When migrating from the Sadhu database:

1. **Export data** from Sadhu database:
   ```bash
   pg_dump -U sadhu_user -d sadhu_db -F c -f sadhu_backup.dump
   ```

2. **Transform data** to match SLMS schema (use custom migration scripts)

3. **Import data** into SLMS database:
   ```bash
   python manage.py migrate
   python manage.py loaddata transformed_data.json
   ```

4. **Verify data integrity**:
   ```bash
   python manage.py check_data_integrity
   ```

### 7. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 8. Run Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## Project Structure

```
server/
├── manage.py                   # Django management script
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create from .env.example)
├── .env.example                # Environment variables template
├── slms_core/                  # Main project configuration
│   ├── __init__.py
│   ├── settings.py             # Django settings
│   ├── urls.py                 # Root URL configuration
│   ├── wsgi.py
│   └── asgi.py
├── apps/                       # Django apps
│   ├── departments/            # Department management
│   ├── students/               # Student management
│   ├── alumni/                 # Alumni management
│   ├── applications/           # Application submissions
│   ├── documents/              # Document management
│   └── dashboard/              # Dashboard statistics
└── utils/                      # Utility functions
    └── file_handler.py         # File upload handling
```

## API Endpoints

### Students
- `GET /api/students/` - List all students
- `POST /api/students/` - Create new student
- `GET /api/students/{id}/` - Get student details
- `PUT /api/students/{id}/` - Update student
- `DELETE /api/students/{id}/` - Delete student
- `GET /api/students/search/?q={query}` - Search students
- `POST /api/students/{id}/upload-photo/` - Upload profile photo
- `POST /api/students/{id}/transition-to-alumni/` - Transition to alumni

### Alumni
- `GET /api/alumni/` - List all alumni
- `GET /api/alumni/{id}/` - Get alumni details
- `PUT /api/alumni/{id}/` - Update alumni
- `POST /api/alumni/{id}/add-career-position/` - Add career position
- `PUT /api/alumni/{id}/update-support-category/` - Update support status
- `GET /api/alumni/stats/` - Get alumni statistics

### Applications
- `GET /api/applications/` - List all applications
- `POST /api/applications/submit/` - Submit application (public)
- `GET /api/applications/{id}/` - Get application details
- `PUT /api/applications/{id}/review/` - Review application
- `DELETE /api/applications/{id}/` - Delete application

### Documents
- `GET /api/documents/` - List all documents
- `POST /api/documents/` - Upload document
- `GET /api/documents/{id}/` - Get document details
- `DELETE /api/documents/{id}/` - Delete document

### Departments
- `GET /api/departments/` - List all departments
- `POST /api/departments/` - Create department
- `GET /api/departments/{id}/` - Get department details
- `PUT /api/departments/{id}/` - Update department
- `DELETE /api/departments/{id}/` - Delete department
- `GET /api/departments/{id}/students/` - Get department students

### Dashboard
- `GET /api/dashboard/stats/` - Get dashboard statistics

## File Storage

Files are stored in the frontend directory at `client/assets/images/`:
- Student photos: `client/assets/images/students/`
- Documents: `client/assets/images/documents/`

The database stores only relative paths (e.g., `"students/photo_123.jpg"`).

## Testing

Run tests:
```bash
python manage.py test
```

Run property-based tests:
```bash
python manage.py test --tag=property
```

## Development

### Adding a New App

```bash
python manage.py startapp app_name apps/app_name
```

Then add `'apps.app_name'` to `INSTALLED_APPS` in `settings.py`.

### Making Migrations

After modifying models:
```bash
python manage.py makemigrations
python manage.py migrate
```

### Accessing Django Admin

Navigate to `http://localhost:8000/admin/` and login with superuser credentials.

## Troubleshooting

### Database Connection Error

- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if database exists: `psql -U postgres -l`

### CORS Errors

- Verify frontend URL is in `CORS_ALLOWED_ORIGINS` in `.env`
- Ensure `corsheaders` middleware is properly configured

### File Upload Errors

- Ensure `client/assets/images/` directory exists
- Check file permissions
- Verify file size and type validations

## Frontend Integration

The frontend applications (admin-side and student-side) are fully integrated with this backend API. All pages fetch real data from the database through the API endpoints.

### API Service Layer

The frontend uses a comprehensive API service layer located in:
- `client/admin-side/src/services/` - Admin-side API services
- `client/student-side/src/services/` - Student-side API services

Each service handles:
- CRUD operations for specific entities
- Error handling and retry logic
- TypeScript type safety
- Authentication token management

### No Mock Data

**All mock/sample data has been removed from the frontend applications.** The system now exclusively uses real data from the PostgreSQL database through the Django REST API.

### Loading and Error States

All pages implement:
- Loading states with skeleton loaders
- Error states with retry functionality
- Empty states for no data scenarios
- Proper error messages for different failure types

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Generate a strong `SECRET_KEY`
3. Configure `ALLOWED_HOSTS` with your domain
4. Use a production-grade WSGI server (gunicorn, uWSGI)
5. Set up HTTPS
6. Configure PostgreSQL for production
7. Set up proper file storage (consider cloud storage for production)
8. **Ensure sample data scripts are disabled** (`.disabled` extension)
9. Import real data from Sadhu database
10. Verify all API endpoints are working correctly

## License

This project is part of the Student Learning Management System.
