
## Proper Setup on New Device

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd sipi-database
```

### Step 2: Backend Setup
```bash
cd server

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

#or
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# Edit .env with your database credentials
```

### Step 3: Database Setup
```bash
# Create PostgreSQL database
# In PostgreSQL:
CREATE DATABASE slms_db;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE slms_db TO your_user;

# Run migrations (this creates ALL tables including activity_logs)
python manage.py migrate

# Create admin user
python create_admin_user.py

# Start server
python manage.py runserver
```
or 

# Connect to PostgreSQL
```bash
sudo -u postgres psql


# Inside psql, run these commands:
CREATE DATABASE slms_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';

ALTER DATABASE sipi_db OWNER TO sipi_web;
ALTER USER sipi_web CREATEDB;

or 

$env:PGPASSWORD='postgres_pass'; psql -U postgres -h localhost -f recreate_database.sql


ALTER ROLE sipi_web SET client_encoding TO 'utf8';
ALTER ROLE sipi_web SET default_transaction_isolation TO 'read committed';
ALTER ROLE sipi_web SET default_transaction_deferrable TO on;
ALTER ROLE sipi_web SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;

# Exit psql
\q
```

### Step 4: Frontend Setup
```bash
# In a new terminal
cd client/admin-side

# Install dependencies
npm install

# Copy environment file
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# Start development server
npm run dev
```

### Step 5: Student Side Setup
```bash
# In another terminal
cd client/student-side

# Install dependencies
npm install

# Copy environment file
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# Start development server
npm run dev
```

## That's It!

**No special scripts needed.** Django migrations handle everything.

## What Django Migrations Do Automatically

When you run `python manage.py migrate`, Django:
1. ✅ Creates all database tables
2. ✅ Creates the activity_logs table
3. ✅ Sets up all relationships
4. ✅ Creates indexes
5. ✅ Handles all constraints

## Files That ARE Part of the Project

These files are in your repository and will work on any device:

### Code Files (Always Needed)
- ✅ `server/apps/departments/serializers.py` - Fixed serializer
- ✅ `server/apps/departments/views.py` - Fixed views
- ✅ `server/slms_core/settings.py` - Settings with middleware
- ✅ `server/apps/activity_logs/models.py` - Activity log model
- ✅ `server/apps/activity_logs/middleware.py` - Middleware
- ✅ `server/apps/activity_logs/signals.py` - Signals (disabled)
- ✅ All migration files in `server/apps/*/migrations/`

### Utility Files (Optional - Only for Troubleshooting)
- ⚠️ `server/fix_activity_logs.py` - Only if table is missing
- ⚠️ `server/check_and_fix_activity_logs.py` - Only for verification
- ⚠️ `server/fix_activity_logs_null.py` - Only for specific issues

### Documentation Files (Reference Only)
- 📄 `FINAL_SOLUTION.md`
- 📄 `ACTIVITY_LOGS_FIX.md`
- 📄 `DEPARTMENT_MANAGEMENT_FIX.md`
- 📄 etc.

## Common Setup Issues & Solutions

### Issue 1: "activity_logs table doesn't exist"
**Solution**: Run migrations
```bash
python manage.py migrate
```

### Issue 2: "No module named 'decouple'"
**Solution**: Install dependencies
```bash
pip install -r requirements.txt
```

### Issue 3: "Connection refused" to database
**Solution**: Check database is running and credentials in `.env` are correct

### Issue 4: Department add/update not working
**Solution**: Make sure you:
1. Ran migrations: `python manage.py migrate`
2. Restarted Django server after pulling latest code

## Production Deployment

For production (e.g., on a server), the setup is the same:

```bash
# 1. Clone repository
git clone <repo-url>
cd sipi-database

# 2. Setup backend
cd server
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with production settings

# 4. Run migrations
python manage.py migrate

# 5. Collect static files
python manage.py collectstatic

# 6. Create admin user
python create_admin_user.py

# 7. Start with gunicorn (production server)
gunicorn slms_core.wsgi:application --bind 0.0.0.0:8000

# 8. Setup frontend (build for production)
cd ../../client/admin-side
npm install
npm run build

cd ../student-side
npm install
npm run build
```

## What About the Fixes We Made?

All the fixes are now **part of the code** in these files:
- `server/apps/departments/serializers.py` - Serializer fixes
- `server/apps/departments/views.py` - View error handling
- `server/slms_core/settings.py` - Middleware configuration
- `server/apps/activity_logs/signals.py` - Disabled automatic signals

When you clone the repository, you get all these fixes automatically!

## Testing on New Device

After setup, test that everything works:

```bash
# 1. Start backend
cd server
python manage.py runserver

# 2. Start frontend (new terminal)
cd client/admin-side
npm run dev

# 3. Test in browser
# - Go to http://localhost:8080
# - Login
# - Try adding a department
# - Try editing a department
# - Try deleting a department
# - All should work without errors!
```

## Summary

### On Your Current Device
- ❌ Had to run fix scripts (one-time troubleshooting)
- ❌ Had database issues
- ✅ Now everything is fixed in the code

### On New Device
- ✅ Just run `python manage.py migrate`
- ✅ Everything works automatically
- ✅ No special scripts needed
- ✅ All fixes are in the code

## Quick Setup Checklist

- [ ] Clone repository
- [ ] Install Python dependencies (`pip install -r requirements.txt`)
- [ ] Install Node dependencies (`npm install` in both frontend folders)
- [ ] Create `.env` files
- [ ] Create PostgreSQL database
- [ ] Run migrations (`python manage.py migrate`)
- [ ] Create admin user (`python create_admin_user.py`)
- [ ] Start servers
- [ ] Test department operations

**That's it! No special scripts needed.**

---

**Key Point**: The fix scripts were for troubleshooting your specific setup. On a fresh installation, Django's built-in migration system handles everything correctly.

