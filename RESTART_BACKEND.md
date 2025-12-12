# How to Restart Backend Server

## If using Gunicorn (Production):
```bash
sudo systemctl restart gunicorn
# Check status
sudo systemctl status gunicorn
# View logs
sudo journalctl -u gunicorn -n 100
```

## If using Django runserver (Development):
1. Find the terminal where Django is running
2. Press Ctrl+C to stop it
3. Restart with: `python manage.py runserver 0.0.0.0:8000`

## After restart, check:
1. The server should reload with new code
2. Error responses should now include detailed error messages
3. Check browser console for actual error details

