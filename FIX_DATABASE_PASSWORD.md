# Fix Database Password Configuration

## Problem
The backend is failing with error:
```
connection to server at "localhost" (127.0.0.1), port 5432 failed: fe_sendauth: no password supplied
```

This happens because the `DB_PASSWORD` environment variable is not set.

## Solution

### Step 1: Create `.env` file in the server directory

SSH into your server and navigate to the server directory:
```bash
cd /home/ubuntu/Update2.0_database/server
```

Create a `.env` file (if it doesn't exist):
```bash
nano .env
# or
vi .env
```

### Step 2: Add database configuration

Add the following to your `.env` file (replace with your actual database password):

```env
# Database Configuration
DB_NAME=slms_db
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password_here
DB_HOST=localhost
DB_PORT=5432

# Django Settings (optional, has defaults)
SECRET_KEY=your-secret-key-here
DEBUG=True

# CORS Settings (optional, has defaults)
CORS_ALLOWED_ORIGINS=http://18.138.238.106:8000,http://18.138.238.106
```

**Important**: Replace `your_actual_postgres_password_here` with your actual PostgreSQL password!

### Step 3: Find your PostgreSQL password

If you don't know your PostgreSQL password, you can:

**Option A: Check if PostgreSQL allows local connections without password**
```bash
sudo -u postgres psql
```
If this works, you might not need a password, but you should still set one.

**Option B: Reset PostgreSQL password**
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'your_new_password';
\q
```

Then use that password in your `.env` file.

**Option C: Check existing configuration**
If you set up PostgreSQL before, check:
- Any setup scripts you ran
- Documentation/notes
- System environment variables: `echo $DB_PASSWORD`

### Step 4: Set file permissions (security)

Make sure the `.env` file is not readable by others:
```bash
chmod 600 .env
```

### Step 5: Restart the backend server

After creating/updating the `.env` file, restart your backend:

**If using Gunicorn:**
```bash
sudo systemctl restart gunicorn
sudo systemctl status gunicorn
```

**If using Django runserver:**
- Stop it (Ctrl+C) and restart:
```bash
python manage.py runserver 0.0.0.0:8000
```

### Step 6: Test the connection

Try logging in again. The 500 errors should be resolved.

## Verify Configuration

You can verify the database connection works by running:
```bash
cd /home/ubuntu/Update2.0_database/server
source venv/bin/activate
python manage.py dbshell
```

If this connects successfully, your database configuration is correct.

## Security Note

**Never commit the `.env` file to git!** It should already be in `.gitignore`. The `.env` file contains sensitive credentials.

