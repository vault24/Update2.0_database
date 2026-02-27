# Environment Configuration Guide

## Overview

This project has separate environment configurations for development and production.

---

## Production Server Configuration

**Server IP**: 13.250.99.61
- **Student Frontend**: http://13.250.99.61:80
- **Admin Frontend**: http://13.250.99.61:8080
- **Backend API**: http://13.250.99.61/api (proxied via NGINX)

---

## Environment Files

### Backend (Django)

**Development**: `server/.env`
```env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
VITE_API_BASE_URL=http://localhost:8000/api
```

**Production**: `server/.env.production`
```env
DEBUG=False
ALLOWED_HOSTS=13.250.99.61,localhost,127.0.0.1
SECRET_KEY=<generate-new-key>
DB_PASSWORD=<secure-password>
```

### Admin Frontend

**Development**: `client/admin-side/.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

**Production**: `client/admin-side/.env.production`
```env
VITE_API_BASE_URL=http://13.250.99.61/api
```

### Student Frontend

**Development**: `client/student-side/.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

**Production**: `client/student-side/.env.production`
```env
VITE_API_BASE_URL=http://13.250.99.61/api
```

---

## Django Settings (CORS & CSRF)

The `server/slms_core/settings.py` file has been updated with production URLs:

```python
CORS_ALLOWED_ORIGINS = [
    # Production URLs
    "http://13.250.99.61",        # student production
    "http://13.250.99.61:8080",   # admin production
    # Development URLs
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8082",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8082",
]

CSRF_TRUSTED_ORIGINS = [
    # Production URLs
    "http://13.250.99.61",
    "http://13.250.99.61:8080",
    # Development URLs (same as above)
]
```

---

## Setup Instructions

### For Local Development

1. **Backend**:
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your local settings
   ```

2. **Admin Frontend**:
   ```bash
   cd client/admin-side
   cp .env.example .env
   # Keep VITE_API_BASE_URL=http://localhost:8000/api
   ```

3. **Student Frontend**:
   ```bash
   cd client/student-side
   cp .env.example .env
   # Keep VITE_API_BASE_URL=http://localhost:8000/api
   ```

### For Production Deployment

1. **Backend**:
   ```bash
   cd server
   cp .env.production .env
   nano .env
   # Update these values:
   # - SECRET_KEY (generate new)
   # - DB_PASSWORD (secure password)
   # - EMAIL_HOST_USER
   # - EMAIL_HOST_PASSWORD
   ```

2. **Admin Frontend**:
   ```bash
   cd client/admin-side
   cp .env.production .env
   # Build with: npm run build
   ```

3. **Student Frontend**:
   ```bash
   cd client/student-side
   cp .env.production .env
   # Build with: npm run build
   ```

---

## Generate Secure Keys

### Django SECRET_KEY

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Database Password

```bash
openssl rand -base64 32
```

---

## Switching Between Environments

### Development to Production

```bash
# Backend
cd server
cp .env.production .env
# Edit and update sensitive values

# Admin Frontend
cd client/admin-side
cp .env.production .env
npm run build

# Student Frontend
cd client/student-side
cp .env.production .env
npm run build
```

### Production to Development

```bash
# Backend
cd server
cp .env.example .env

# Admin Frontend
cd client/admin-side
cp .env.example .env

# Student Frontend
cd client/student-side
cp .env.example .env
```

---

## Verification

### Check Backend Configuration

```bash
cd server
source venv/bin/activate
python manage.py check
python manage.py showmigrations
```

### Check Frontend Configuration

```bash
# Admin
cd client/admin-side
cat .env
npm run build

# Student
cd client/student-side
cat .env
npm run build
```

### Test CORS Configuration

```bash
# From your local machine
curl -H "Origin: http://13.250.99.61" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://13.250.99.61/api/
```

---

## Important Notes

1. **Never commit production .env files** to version control
2. **Always use .env.example** as templates
3. **Generate new SECRET_KEY** for production
4. **Use strong passwords** for database
5. **Keep email credentials secure**
6. **Update ALLOWED_HOSTS** if you add a domain name
7. **Add HTTPS URLs** to CORS/CSRF when SSL is configured

---

## SSL/HTTPS Configuration (Future)

When you add SSL certificates, update:

1. **Django Settings**:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "https://yourdomain.com",
       "https://yourdomain.com:8080",
   ]
   
   CSRF_COOKIE_SECURE = True
   SESSION_COOKIE_SECURE = True
   ```

2. **Frontend .env**:
   ```env
   VITE_API_BASE_URL=https://yourdomain.com/api
   ```

---

## Troubleshooting

### CORS Errors

1. Check Django settings include your frontend URL
2. Verify NGINX proxy headers are set correctly
3. Check browser console for specific CORS error
4. Restart Gunicorn after settings changes

### API Connection Errors

1. Verify .env file has correct API URL
2. Check NGINX is running and proxying correctly
3. Verify Gunicorn is running on port 8000
4. Check firewall allows ports 80 and 8080

### Build Errors

1. Delete node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist`
3. Check .env file exists and is valid
4. Verify Node.js version is 18+

---

## Quick Commands

```bash
# Check all environment files
find . -name ".env*" -type f

# View production URLs
grep -r "13.250.99.61" .

# Test backend
cd server && source venv/bin/activate && python manage.py runserver

# Build frontends
cd client/admin-side && npm run build
cd client/student-side && npm run build

# Deploy to production
./deploy.sh
```

---

## Contact

For deployment issues, check:
- `PRODUCTION_DEPLOYMENT.md` - Full deployment guide
- `/var/log/gunicorn/error.log` - Backend errors
- `/var/log/nginx/error.log` - NGINX errors
- Browser console - Frontend errors
