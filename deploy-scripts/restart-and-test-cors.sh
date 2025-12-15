#!/bin/bash

echo "🔧 Restarting Services and Testing CORS Fix"
echo "==========================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Restarting Gunicorn to apply CORS changes..."
sudo systemctl restart gunicorn
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Gunicorn restarted successfully"
else
    echo "[ERROR] ❌ Failed to restart Gunicorn"
    exit 1
fi

echo "[INFO] Step 2: Reloading NGINX..."
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ NGINX reloaded successfully"
else
    echo "[ERROR] ❌ Failed to reload NGINX"
fi

echo "[INFO] Step 3: Testing CORS configuration..."

# Test CORS preflight for admin frontend
echo "[INFO] Testing CORS preflight for admin frontend..."
ADMIN_CORS=$(curl -s -I -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/me/" | grep -i "access-control-allow-origin")

echo "Admin CORS Response: $ADMIN_CORS"

# Test CORS preflight for student frontend
echo "[INFO] Testing CORS preflight for student frontend..."
STUDENT_CORS=$(curl -s -I -H "Origin: http://47.128.236.25" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/me/" | grep -i "access-control-allow-origin")

echo "Student CORS Response: $STUDENT_CORS"

# Test actual API endpoints
echo "[INFO] Testing API endpoints..."
API_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://47.128.236.25/api/auth/csrf/")
echo "API CSRF endpoint status: $API_TEST"

echo ""
echo "🎉 CORS fix applied and services restarted!"
echo ""
echo "Configuration summary:"
echo "• Removed duplicate CORS origins"
echo "• Clean CORS list: http://47.128.236.25, http://47.128.236.25:8080"
echo "• Updated both Django settings and .env file"
echo "• Restarted all services"
echo ""
echo "The admin frontend CORS errors should now be resolved!"
echo "Test at: http://47.128.236.25:8080"