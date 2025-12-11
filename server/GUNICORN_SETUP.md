# Gunicorn Systemd Service Setup Guide

This guide will help you set up Gunicorn as a systemd service for your Django application.

## Prerequisites

1. Gunicorn installed in your virtual environment
2. PostgreSQL service running
3. Proper directory permissions
4. Log directories created

## Step 1: Install Gunicorn (if not already installed)

```bash
cd /path/to/sipi-database/server
source venv/bin/activate
pip install gunicorn
```

## Step 2: Create Required Directories

```bash
# Create log directory
sudo mkdir -p /var/log/gunicorn
sudo chown www-data:www-data /var/log/gunicorn

# Create PID directory
sudo mkdir -p /var/run/gunicorn
sudo chown www-data:www-data /var/run/gunicorn
```

## Step 3: Configure the Service File

1. Copy the example service file:
   ```bash
   sudo cp gunicorn.service.example /etc/systemd/system/gunicorn.service
   ```

2. Edit the service file with your actual paths:
   ```bash
   sudo nano /etc/systemd/system/gunicorn.service
   ```

3. Update the following variables:
   - `User` and `Group`: Your web server user (usually `www-data` or `nginx`)
   - `WorkingDirectory`: Full path to your `server` directory
   - `PATH`: Full path to your virtual environment's `bin` directory
   - `ExecStart`: Update all paths in the gunicorn command
   - `ReadWritePaths`: Update paths to match your project location

## Step 4: Adjust Gunicorn Workers

The number of workers should be calculated as: `(2 × CPU cores) + 1`

For example:
- 2 CPU cores: `--workers 5`
- 4 CPU cores: `--workers 9`
- 8 CPU cores: `--workers 17`

You can check your CPU cores:
```bash
nproc
```

## Step 5: Set Permissions

```bash
# Ensure your project directory has correct permissions
sudo chown -R www-data:www-data /path/to/sipi-database/server
sudo chmod -R 755 /path/to/sipi-database/server

# Ensure static files directory is writable (if needed)
sudo chmod -R 755 /path/to/sipi-database/server/staticfiles
```

## Step 6: Reload Systemd and Start Service

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable gunicorn.service

# Start the service
sudo systemctl start gunicorn.service

# Check service status
sudo systemctl status gunicorn.service
```

## Step 7: Verify Service is Running

```bash
# Check if Gunicorn is listening on port 8000
sudo netstat -tlnp | grep 8000
# or
sudo ss -tlnp | grep 8000

# Check logs
sudo journalctl -u gunicorn.service -f
# or
sudo tail -f /var/log/gunicorn/error.log
```

## Common Commands

```bash
# Start service
sudo systemctl start gunicorn

# Stop service
sudo systemctl stop gunicorn

# Restart service
sudo systemctl restart gunicorn

# Reload service (graceful restart)
sudo systemctl reload gunicorn

# Check status
sudo systemctl status gunicorn

# View logs
sudo journalctl -u gunicorn -n 50
sudo tail -f /var/log/gunicorn/error.log
```

## Troubleshooting

### Service fails to start

1. Check service status:
   ```bash
   sudo systemctl status gunicorn
   ```

2. Check logs:
   ```bash
   sudo journalctl -u gunicorn -n 100
   ```

3. Verify paths in service file are correct

4. Check permissions:
   ```bash
   ls -la /path/to/sipi-database/server
   ```

### Permission denied errors

```bash
# Fix ownership
sudo chown -R www-data:www-data /path/to/sipi-database/server

# Fix log directory
sudo chown -R www-data:www-data /var/log/gunicorn
sudo chown -R www-data:www-data /var/run/gunicorn
```

### Port already in use

```bash
# Find process using port 8000
sudo lsof -i :8000
# or
sudo netstat -tlnp | grep 8000

# Kill the process if needed
sudo kill -9 <PID>
```

### Database connection errors

Ensure PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

## Advanced Configuration

### Using Gunicorn Config File

You can also create a Gunicorn config file for cleaner management:

Create `/path/to/sipi-database/server/gunicorn_config.py`:

```python
# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Restart workers after this many requests
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "slms_gunicorn"

# Server mechanics
daemon = False
pidfile = "/var/run/gunicorn/slms.pid"
umask = 0
user = "www-data"
group = "www-data"
tmp_upload_dir = None

# SSL (if using HTTPS)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"
```

Then update your service file ExecStart to:
```bash
ExecStart=/path/to/sipi-database/server/venv/bin/gunicorn \
    --config /path/to/sipi-database/server/gunicorn_config.py \
    slms_core.wsgi:application
```

## Security Notes

1. **Never run as root**: Always use a non-privileged user
2. **File permissions**: Restrict access to sensitive files
3. **Firewall**: Only expose port 8000 if necessary, or use a reverse proxy (Nginx)
4. **HTTPS**: Use Nginx as reverse proxy with SSL/TLS certificates

## Nginx Reverse Proxy (Recommended)

For production, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name 18.138.238.106;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /static/ {
        alias /path/to/sipi-database/server/staticfiles/;
    }

    location /media/ {
        alias /path/to/sipi-database/server/media/;
    }
}
```


