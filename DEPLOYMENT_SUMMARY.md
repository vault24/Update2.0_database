# Deployment Summary - SLMS Project

## Important Notes

### Document Generation Fix
If document preview shows blank pages in production, ensure:
1. Run `npm run prebuild` or `npm run build` (prebuild runs automatically)
2. Verify `dist/templates/` folder contains all HTML templates and assets
3. See `DOCUMENT_GENERATION_FIX.md` for detailed troubleshooting

## Server Configuration

**Production Server**: 13.250.99.61

### URLs
- **Student Portal**: http://13.250.99.61:80
- **Admin Portal**: http://13.250.99.61:8080
- **Backend API**: http://13.250.99.61/api

---

## What Has Been Updated

### ✅ 1. Django Settings (`server/slms_core/settings.py`)

Updated CORS and CSRF configurations:
```python
CORS_ALLOWED_ORIGINS = [
    "http://13.250.99.61",        # student production
    "http://13.250.99.61:8080",   # admin production
    # + development URLs
]

CSRF_TRUSTED_ORIGINS = [
    "http://13.250.99.61",
    "http://13.250.99.61:8080",
    # + development URLs
]
```

### ✅ 2. Environment Files

Created production-ready environment files:

- `server/.env.production` - Backend production config
- `client/admin-side/.env.production` - Admin frontend production config
- `client/student-side/.env.production` - Student frontend production config

Updated example files:
- `server/.env.example`
- `client/admin-side/.env.example`
- `client/student-side/.env.example`

### ✅ 3. Documentation

Created comprehensive guides:
- `PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- `ENVIRONMENT_SETUP.md` - Environment configuration guide
- `DEPLOYMENT_SUMMARY.md` - This file

---

## Quick Deployment Steps

### On Your Server (13.250.99.61)

```bash
# 1. Clone project
cd /home/ubuntu
git clone <your-repo> slms-project
cd slms-project

# 2. Setup backend
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.production .env
nano .env  # Update SECRET_KEY, DB_PASSWORD, EMAIL settings

# 3. Setup database
sudo -u postgres psql
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
\q

# 4. Run migrations
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput

# 5. Build frontends
cd /home/ubuntu/slms-project/client/admin-side
npm install
cp .env.production .env
npm run build

cd /home/ubuntu/slms-project/client/student-side
npm install
cp .env.production .env
npm run build

# 6. Setup services (see PRODUCTION_DEPLOYMENT.md)
# - Gunicorn service
# - NGINX configuration
# - Firewall rules
```

---

## Configuration Files Summary

### Backend Configuration

**File**: `server/.env.production`
```env
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=CHANGE_THIS
SECRET_KEY=CHANGE_THIS
DEBUG=False
ALLOWED_HOSTS=13.250.99.61,localhost,127.0.0.1
```

### Admin Frontend Configuration

**File**: `client/admin-side/.env.production`
```env
VITE_API_BASE_URL=http://13.250.99.61/api
```

### Student Frontend Configuration

**File**: `client/student-side/.env.production`
```env
VITE_API_BASE_URL=http://13.250.99.61/api
```

---

## NGINX Configuration

Both frontends are served by NGINX:

- **Port 80**: Student frontend (`client/student-side/dist`)
- **Port 8080**: Admin frontend (`client/admin-side/dist`)
- **API Proxy**: Both ports proxy `/api/` to `http://127.0.0.1:8000`

---

## Security Checklist

Before going live:

- [ ] Generate new SECRET_KEY for Django
- [ ] Set strong database password
- [ ] Set DEBUG=False in production
- [ ] Configure email settings
- [ ] Update ALLOWED_HOSTS if using domain
- [ ] Configure AWS Security Group (ports 22, 80, 8080)
- [ ] Setup UFW firewall
- [ ] Setup automated backups
- [ ] Test all functionality
- [ ] Setup SSL/TLS (recommended)

---

## Testing Checklist

After deployment:

- [ ] Student portal loads: http://13.250.99.61
- [ ] Admin portal loads: http://13.250.99.61:8080
- [ ] API responds: http://13.250.99.61/api/
- [ ] Login works on both portals
- [ ] File uploads work
- [ ] Static files load correctly
- [ ] No CORS errors in browser console
- [ ] Database connections work
- [ ] Email notifications work

---

## Useful Commands

### Service Management
```bash
sudo systemctl restart gunicorn
sudo systemctl restart nginx
sudo systemctl status gunicorn
sudo systemctl status nginx
```

### View Logs
```bash
sudo tail -f /var/log/gunicorn/error.log
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u gunicorn -f
```

### Update Deployment
```bash
cd /home/ubuntu/slms-project
git pull
./deploy.sh
```

### Backup Database
```bash
./backup.sh
```

---

## Port Configuration

| Service | Port | Access |
|---------|------|--------|
| Student Frontend | 80 | Public |
| Admin Frontend | 8080 | Public |
| Django Backend | 8000 | Internal (via NGINX proxy) |
| PostgreSQL | 5432 | Internal only |
| Redis | 6379 | Internal only |

---

## Next Steps

1. **Review** `PRODUCTION_DEPLOYMENT.md` for detailed deployment steps
2. **Configure** production environment files with secure credentials
3. **Deploy** following the step-by-step guide
4. **Test** all functionality after deployment
5. **Setup** automated backups
6. **Monitor** logs for any issues
7. **Consider** adding SSL/TLS for HTTPS

---

## Support

For issues during deployment:

1. Check service status: `sudo systemctl status gunicorn nginx`
2. Review logs: `sudo tail -f /var/log/gunicorn/error.log`
3. Verify configuration: `sudo nginx -t`
4. Check firewall: `sudo ufw status`
5. Test connectivity: `curl http://13.250.99.61`

---

## Files Modified

- ✅ `server/slms_core/settings.py` - Added production CORS/CSRF URLs
- ✅ `server/.env.example` - Updated with production IP
- ✅ `client/admin-side/.env` - Updated comment with production IP
- ✅ `client/admin-side/.env.example` - Updated with production IP
- ✅ `client/student-side/.env` - Updated comment with production IP
- ✅ `client/student-side/.env.example` - Updated with production IP

## Files Created

- ✅ `server/.env.production` - Production backend config
- ✅ `client/admin-side/.env.production` - Production admin config
- ✅ `client/student-side/.env.production` - Production student config
- ✅ `PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- ✅ `ENVIRONMENT_SETUP.md` - Environment configuration guide
- ✅ `DEPLOYMENT_SUMMARY.md` - This summary

---

**Ready to deploy! 🚀**

Follow `PRODUCTION_DEPLOYMENT.md` for step-by-step instructions.
