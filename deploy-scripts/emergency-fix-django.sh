#!/bin/bash

echo "🚨 Emergency Django Fix - Restoring Service"
echo "=========================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Stopping all services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo ""
echo "[INFO] Step 2: Fixing .env file with correct CORS settings..."
cat > server/.env << 'EOF'
# Database Configuration
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=sipiadmin
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY=sipi-prod-2024-k8x9m2n7p4q1w5e8r3t6y9u2i5o8p1a4s7d0f3g6h9j2k5l8m1n4q7r0t3w6z9
DEBUG=False
ALLOWED_HOSTS=47.128.236.25,localhost,127.0.0.1

# CORS Settings - Clean list without duplicates
CORS_ALLOWED_ORIGINS=http://47.128.236.25,http://47.128.236.25:8080

# CSRF Settings - Clean list without duplicates  
CSRF_TRUSTED_ORIGINS=http://47.128.236.25,http://47.128.236.25:8080
EOF

echo "[INFO] ✅ Fixed .env file"

echo ""
echo "[INFO] Step 3: Testing Django configuration..."
cd server
source venv/bin/activate

echo "Testing Django settings import..."
python -c "
import os
import sys
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
try:
    import django
    django.setup()
    print('✅ Django settings loaded successfully')
except Exception as e:
    print(f'❌ Django settings error: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "[ERROR] Django configuration has errors. Checking for issues..."
    python manage.py check --deploy
    exit 1
fi

echo ""
echo "[INFO] Step 4: Testing Django management commands..."
python manage.py check
if [ $? -ne 0 ]; then
    echo "[ERROR] Django check failed"
    exit 1
fi

echo ""
echo "[INFO] Step 5: Starting Gunicorn manually to check for errors..."
cd "$PROJECT_DIR"

# Test Gunicorn directly
echo "Testing Gunicorn startup..."
timeout 10s server/venv/bin/gunicorn --workers 1 --bind 127.0.0.1:8001 --chdir server slms_core.wsgi:application &
GUNICORN_PID=$!

sleep 3

# Check if Gunicorn is running
if kill -0 $GUNICORN_PID 2>/dev/null; then
    echo "[INFO] ✅ Gunicorn test successful"
    kill $GUNICORN_PID
else
    echo "[ERROR] ❌ Gunicorn failed to start"
    exit 1
fi

echo ""
echo "[INFO] Step 6: Starting services..."
sudo systemctl start gunicorn
sleep 5

# Check Gunicorn status
if sudo systemctl is-active --quiet gunicorn; then
    echo "[INFO] ✅ Gunicorn started successfully"
else
    echo "[ERROR] ❌ Gunicorn failed to start via systemd"
    echo "Checking logs:"
    sudo journalctl -u gunicorn --no-pager -l --since "1 minute ago"
    exit 1
fi

sudo systemctl start nginx
sleep 2

if sudo systemctl is-active --quiet nginx; then
    echo "[INFO] ✅ NGINX started successfully"
else
    echo "[ERROR] ❌ NGINX failed to start"
    exit 1
fi

echo ""
echo "[INFO] Step 7: Testing API endpoint..."
API_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://47.128.236.25/api/auth/csrf/")
echo "API test result: $API_TEST"

if [ "$API_TEST" = "200" ]; then
    echo "[INFO] ✅ API is working!"
else
    echo "[WARNING] ⚠️ API returned: $API_TEST"
fi

echo ""
echo "[INFO] Step 8: Testing CORS for admin frontend..."
CORS_TEST=$(curl -s -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS "http://47.128.236.25/api/auth/csrf/" \
  -w "%{http_code}" -o /dev/null)

echo "CORS test result: $CORS_TEST"

echo ""
echo "🎉 Emergency fix complete!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo "• API Health: $API_TEST"
echo "• CORS Test: $CORS_TEST"
echo ""
echo "Your websites should now be accessible:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
if [ "$API_TEST" = "200" ] && [ "$CORS_TEST" = "200" ]; then
    echo "✅ All systems operational!"
else
    echo "⚠️ Some issues remain - check the logs above"
fi