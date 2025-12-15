# SLMS Deployment Scripts

This directory contains automated deployment scripts for the Student Learning Management System (SLMS) on AWS Ubuntu server.

## Quick Start

For a complete automated deployment, run:

```bash
# Make sure you're in the project root directory
cd /home/ubuntu/slms-project

# Run the complete deployment script
chmod +x deploy-scripts/deploy-all.sh
./deploy-scripts/deploy-all.sh
```

## Individual Scripts

If you prefer to run steps individually:

### 1. Server Setup
```bash
chmod +x deploy-scripts/setup-server.sh
./deploy-scripts/setup-server.sh
```
- Installs system packages (Python, Node.js, PostgreSQL, NGINX)
- Configures PostgreSQL database
- Sets up firewall rules

### 2. Backend Deployment
```bash
chmod +x deploy-scripts/deploy-backend.sh
./deploy-scripts/deploy-backend.sh
```
- Sets up Python virtual environment
- Installs Python dependencies
- Configures Django settings
- Sets up Gunicorn service

### 3. Frontend Deployment
```bash
chmod +x deploy-scripts/deploy-frontend.sh
./deploy-scripts/deploy-frontend.sh
```
- Builds admin frontend (React/Vite)
- Builds student frontend (React/Vite)
- Sets proper file permissions

### 4. NGINX Configuration
```bash
chmod +x deploy-scripts/configure-nginx.sh
./deploy-scripts/configure-nginx.sh
```
- Configures NGINX for both frontends
- Sets up API proxy to Django backend
- Enables and starts NGINX service


if have any error for pg ar migret premition

```bash
# Make the script executable
chmod +x ~/Update2.0_database/deploy-scripts/fix-database-permissions.sh
~/Update2.0_database/deploy-scripts/fix-database-permissions.sh
```

## Prerequisites

- AWS Ubuntu EC2 instance
- SSH access with ubuntu user
- Sudo privileges
- Project code cloned to `/home/ubuntu/slms-project`

## What Gets Deployed

After successful deployment:

- **Student Frontend**: http://47.128.236.25 (port 80)
- **Admin Frontend**: http://47.128.236.25:8080 (port 8080)
- **Backend API**: http://127.0.0.1:8000 (internal, proxied via NGINX)

## Services Created

1. **Gunicorn Service**: `/etc/systemd/system/gunicorn.service`
   - Runs Django backend on port 8000
   - Auto-starts on boot

2. **NGINX Configuration**: `/etc/nginx/sites-available/slms`
   - Serves both frontends
   - Proxies API requests to Django

3. **PostgreSQL Database**: `sipi_db`
   - User: `sipi_web`
   - Password: `sipiadmin`

## Manual Configuration Required

After running the scripts, you may need to:

1. **Edit Django Settings** (`server/.env`):
   ```env
   SECRET_KEY=your-very-secure-secret-key-here
   DEBUG=False
   ALLOWED_HOSTS=47.128.236.25,localhost,127.0.0.1
   ```

2. **Create Django Superuser**:
   ```bash
   cd server
   source venv/bin/activate
   python manage.py createsuperuser
   ```

3. **Configure AWS Security Group**:
   - Allow port 22 (SSH)
   - Allow port 80 (HTTP)
   - Allow port 8080 (Admin Frontend)

## Troubleshooting

### Check Service Status
```bash
sudo systemctl status gunicorn
sudo systemctl status nginx
sudo systemctl status postgresql
```

### View Logs
```bash
# Gunicorn logs
sudo journalctl -u gunicorn -f

# NGINX logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

### Common Issues

1. **502 Bad Gateway**: Gunicorn not running
   ```bash
   sudo systemctl restart gunicorn
   sudo journalctl -u gunicorn -f
   ```

2. **Static Files Not Loading**: Permissions issue
   ```bash
   cd /home/ubuntu/Update2.0_database
   python server/manage.py collectstatic --noinput
   sudo chmod -R 755 server/staticfiles/
   ```

3. **Database Connection Error**: PostgreSQL not configured
   ```bash
   sudo systemctl status postgresql
   # Check server/.env database settings
   ```

## File Structure After Deployment

```
/home/ubuntu/slms-project/
├── server/
│   ├── venv/                 # Python virtual environment
│   ├── .env                  # Production environment variables
│   ├── staticfiles/          # Collected Django static files
│   └── ...
├── client/
│   ├── admin-side/
│   │   ├── dist/            # Built admin frontend
│   │   └── .env             # Frontend environment variables
│   └── student-side/
│       ├── dist/            # Built student frontend
│       └── .env             # Frontend environment variables
└── deploy-scripts/          # These deployment scripts
```

## Maintenance

### Update Code
```bash
cd /home/ubuntu/slms-project
git pull origin main

# Update backend
cd server
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn

# Update frontend
cd ../client/admin-side
npm install && npm run build
cd ../student-side
npm install && npm run build
sudo systemctl restart nginx
```

### Database Backup
```bash
pg_dump -U sipi_web -h localhost sipi_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Security Notes

- Change default database password
- Use strong Django SECRET_KEY
- Keep system packages updated
- Monitor logs regularly
- Set up regular backups

## Support

For issues with deployment:
1. Check the troubleshooting section above
2. Review service logs
3. Verify AWS Security Group settings
4. Ensure all prerequisites are met