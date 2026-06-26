# Local Development Guide - SLMS Project

> Run the project on your own computer for development and testing.

## Step 1: Get the Project

```bash
git clone https://github.com/vault24/Update2.0_database.git slms-project
cd slms-project
```

---

## Step 2: Setup the Database

Open your terminal and run:

```bash
# Open PostgreSQL shell
psql -U postgres
```

Inside the PostgreSQL shell, run these commands one by one:

```sql
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
ALTER USER sipi_web CREATEDB;
\q
```

---

## Step 3: Setup the Backend (Django)

```bash
# Go to the server folder
cd slms-project/server

# Create a virtual environment
python -m venv venv

# Activate it
# On Windows:
.\venv\Scripts\Activate.ps1
# On Mac/Linux:
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

### Create your `.env` file

Inside the `server/` folder, create a file named `.env` and paste this:

```env
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=sipiadmin
DB_HOST=localhost
DB_PORT=5432

SECRET_KEY=any-random-string-for-local-dev-only
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

> Tip: For local dev, `DEBUG=True` shows detailed error pages which helps with debugging.

### Run database migrations and create admin user

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Start the backend server

```bash
python manage.py runserver
```

Backend is now running at: **http://127.0.0.1:8000**

---

## Step 4: Setup the Admin Frontend

Open a new terminal window:

```bash
cd slms-project/client/admin-side
npm install
```

Create a `.env` file inside `client/admin-side/`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Start the dev server:

```bash
npm run dev
```

Admin frontend is now running at: **http://localhost:5173** (or similar port shown in terminal)

---

## Step 5: Setup the Student Frontend

Open another new terminal window:

```bash
cd slms-project/client/student-side
npm install
```

Create a `.env` file inside `client/student-side/`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Start the dev server:

```bash
npm run dev
```

Student frontend is now running at: **http://localhost:5174** (or similar port shown in terminal)

---

## Summary: What Runs Where

| Service | URL | Terminal |
|---------|-----|----------|
| Backend API | http://127.0.0.1:8000 | Terminal 1 |
| Django Admin | http://127.0.0.1:8000/admin | Terminal 1 |
| Admin Frontend | http://localhost:5173 | Terminal 2 |
| Student Frontend | http://localhost:5174 | Terminal 3 |

> You need 3 terminal windows open at the same time.

---

## Common Issues

**`ModuleNotFoundError` when starting Django**
- Make sure your virtual environment is activated (you should see `(venv)` in your terminal)

**`psycopg2` or database connection error**
- Make sure PostgreSQL is running on your machine
- Double-check the credentials in your `.env` file match what you created in Step 2

**`npm install` fails**
- Make sure Node.js 18+ is installed: `node --version`

**Port already in use**
- Another app is using that port. Stop it or change the port in the run command.

---

## Useful Commands

```bash
# Check for new database changes after pulling code
python manage.py migrate

# Add fake/test data (if fixtures exist)
python manage.py loaddata fixtures/sample_data.json

# Deactivate virtual environment when done
deactivate
```
