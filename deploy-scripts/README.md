# SLMS Deployment Scripts

This directory contains streamlined deployment and maintenance scripts for the Student Learning Management System (SLMS) on AWS Ubuntu server.

## Quick Start

### Option 1: Interactive Menu (Recommended)
```bash
# Make sure you're in the project root directory
cd /home/ubuntu/slms-project

# Run the interactive management script
chmod +x deploy-scripts/slms.sh
./deploy-scripts/slms.sh
```

### Option 2: Direct Deployment
```bash
# Make sure you're in the project root directory
cd /home/ubuntu/slms-project

# Run the single deployment script
chmod +x deploy-scripts/deploy.sh
./deploy-scripts/deploy.sh
```

## Script Organization

The deployment system consists of just **4 essential files**:

```
deploy-scripts/
├── slms.sh          # 🎯 Master interactive script (RECOMMENDED)
├── deploy.sh        # 🚀 Complete automated deployment
├── maintenance.sh   # 🔧 System maintenance tasks
├── troubleshoot.sh  # 🩺 Problem diagnosis and fixes
└── README.md        # 📖 This documentation
```

### Master Script (`slms.sh`) - **Recommended Entry Point**
```bash
chmod +x deploy-scripts/slms.sh
./deploy-scripts/slms.sh
```
- **Interactive menu system** - No need to remember commands
- **Access to all functionality** - Deploy, maintain, troubleshoot
- **User-friendly interface** - Guided workflows
- **Built-in help** - Context-sensitive assistance

## Core Scripts

### 1. Main Deployment (`deploy.sh`)
```bash
chmod +x deploy-scripts/deploy.sh
./deploy-scripts/deploy.sh
```
- Complete automated deployment
- System setup, database configuration
- Backend and frontend deployment
- NGINX configuration and firewall setup

### 2. Maintenance (`maintenance.sh`)
```bash
chmod +x deploy-scripts/maintenance.sh
./deploy-scripts/maintenance.sh [COMMAND]
```
Available commands:
- `status` - Check service status
- `logs` - View service logs
- `restart` - Restart services
- `update` - Update from git
- `backup` - Create database backup
- `restore` - Restore database
- `superuser` - Create Django superuser
- `rebuild` - Rebuild frontend
- `monitor` - Real-time monitoring

### 3. Troubleshooting (`troubleshoot.sh`)
```bash
chmod +x deploy-scripts/troubleshoot.sh
./deploy-scripts/troubleshoot.sh [COMMAND]
```
Available commands:
- `diagnose` - Full system diagnosis
- `fix-502` - Fix 502 Bad Gateway errors
- `fix-cors` - Fix CORS issues
- `fix-perms` - Fix file permissions
- `fix-db` - Fix database issues
- `reset-nginx` - Reset NGINX config

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

## Quick Commands

### Check System Status
```bash
./deploy-scripts/maintenance.sh status
```

### View Logs
```bash
./deploy-scripts/maintenance.sh logs
```

### Restart Services
```bash
./deploy-scripts/maintenance.sh restart
```

### Troubleshooting

For common issues, use the troubleshooting script:

1. **502 Bad Gateway**:
   ```bash
   ./deploy-scripts/troubleshoot.sh fix-502
   ```

2. **CORS Issues**:
   ```bash
   ./deploy-scripts/troubleshoot.sh fix-cors
   ```

3. **Permission Issues**:
   ```bash
   ./deploy-scripts/troubleshoot.sh fix-perms
   ```

4. **Full Diagnosis**:
   ```bash
   ./deploy-scripts/troubleshoot.sh diagnose
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

### Update Application
```bash
./deploy-scripts/maintenance.sh update
```

### Create Database Backup
```bash
./deploy-scripts/maintenance.sh backup
```

### Monitor System
```bash
./deploy-scripts/maintenance.sh monitor
```

## Benefits of New Structure

### ✅ Simplified Management
- **Single Entry Point**: Use `slms.sh` for all tasks
- **Automated Deployment**: One command deploys everything
- **Built-in Troubleshooting**: Automated fixes for common issues
- **Comprehensive Logging**: All operations are logged

### ✅ Improved Reliability
- **Error Handling**: Scripts exit on errors with clear messages
- **Pre-flight Checks**: Validation before operations
- **Service Verification**: Automatic status checking
- **Rollback Capability**: Database backups before updates

### ✅ Better Maintenance
- **Automated Updates**: Pull code, rebuild, restart services
- **System Monitoring**: Real-time status monitoring
- **Log Management**: Easy access to all service logs
- **Backup Management**: Automated database backups

### ✅ Easier Troubleshooting
- **Diagnostic Tools**: Comprehensive system diagnosis
- **Automated Fixes**: One-command fixes for common issues
- **Permission Management**: Automatic permission fixing
- **Service Recovery**: Automated service restart and recovery

## Clean, Minimal Structure

### ✅ What We Removed
- **30+ individual scripts** consolidated into 4 essential files
- **Duplicate functionality** merged into unified commands
- **Legacy fixes** replaced with comprehensive troubleshooting
- **Scattered configurations** centralized in single scripts

### ✅ What You Get Now
- **Single command deployment**: `./deploy-scripts/slms.sh`
- **Everything in one place**: No hunting through multiple files
- **Consistent interface**: Same commands, predictable behavior
- **Easy maintenance**: Only 4 files to manage

## Security Notes

- Change default database password
- Use strong Django SECRET_KEY
- Keep system packages updated
- Monitor logs regularly
- Set up regular backups

## Support

For issues with deployment:
1. Use `./deploy-scripts/slms.sh` and select troubleshooting
2. Run `./deploy-scripts/troubleshoot.sh diagnose` for full diagnosis
3. Check the troubleshooting section above
4. Review service logs via the maintenance script
5. Verify AWS Security Group settings
6. Ensure all prerequisites are met