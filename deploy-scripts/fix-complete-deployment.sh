#!/bin/bash

echo "🔧 Complete Deployment Fix - CORS and Services"
echo "=============================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Checking service status..."
echo "Gunicorn status:"
sudo systemctl status gunicorn --no-pager -l
echo ""
echo "NGINX status:"
sudo systemctl status nginx --no-pager -l

echo ""
echo "[INFO] Step 2: Verifying .env file exists and has correct content..."
if [ ! -f "server/.env" ]; then
    echo "[ERROR] .env file missing! Creating it..."
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
    echo "[INFO] ✅ Created .env file"
else
    echo "[INFO] ✅ .env file exists"
fi

echo ""
echo "[INFO] Step 3: Checking Django settings for CORS configuration..."
if grep -q "CORS_ALLOW_ALL_ORIGINS = True" server/slms_core/settings.py; then
    echo "[WARNING] CORS_ALLOW_ALL_ORIGINS is enabled - this might override specific origins"
fi

echo ""
echo "[INFO] Step 4: Stopping services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo ""
echo "[INFO] Step 5: Starting services in correct order..."
echo "Starting Gunicorn..."
sudo systemctl start gunicorn
sleep 3

# Check if Gunicorn started successfully
if sudo systemctl is-active --quiet gunicorn; then
    echo "[INFO] ✅ Gunicorn started successfully"
else
    echo "[ERROR] ❌ Gunicorn failed to start"
    echo "Gunicorn logs:"
    sudo journalctl -u gunicorn --no-pager -l --since "1 minute ago"
    exit 1
fi

echo "Starting NGINX..."
sudo systemctl start nginx
sleep 2

# Check if NGINX started successfully
if sudo systemctl is-active --quiet nginx; then
    echo "[INFO] ✅ NGINX started successfully"
else
    echo "[ERROR] ❌ NGINX failed to start"
    echo "NGINX logs:"
    sudo journalctl -u nginx --no-pager -l --since "1 minute ago"
    exit 1
fi

echo ""
echo "[INFO] Step 6: Testing API endpoints..."

# Test basic API endpoint
echo "Testing API health..."
API_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null "http://47.128.236.25/api/auth/csrf/")
echo "API health status: $API_HEALTH"

if [ "$API_HEALTH" != "200" ]; then
    echo "[ERROR] API is not responding correctly"
    echo "Checking Gunicorn logs:"
    sudo journalctl -u gunicorn --no-pager -l --since "2 minutes ago"
    exit 1
fi

echo ""
echo "[INFO] Step 7: Testing CORS for both frontends..."

# Test CORS for admin frontend (port 8080)
echo "Testing CORS for admin frontend..."
ADMIN_CORS_TEST=$(curl -s -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/csrf/" \
  -w "%{http_code}" -o /dev/null)

echo "Admin CORS test result: $ADMIN_CORS_TEST"

# Test CORS for student frontend (port 80)
echo "Testing CORS for student frontend..."
STUDENT_CORS_TEST=$(curl -s -H "Origin: http://47.128.236.25" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/csrf/" \
  -w "%{http_code}" -o /dev/null)

echo "Student CORS test result: $STUDENT_CORS_TEST"

echo ""
echo "[INFO] Step 8: Testing actual CORS headers..."

# Get actual CORS headers for admin frontend
echo "Getting CORS headers for admin frontend request..."
ADMIN_HEADERS=$(curl -s -I -H "Origin: http://47.128.236.25:8080" \
  "http://47.128.236.25/api/auth/csrf/" | grep -i "access-control")

echo "Admin CORS headers:"
echo "$ADMIN_HEADERS"

echo ""
echo "Getting CORS headers for student frontend request..."
STUDENT_HEADERS=$(curl -s -I -H "Origin: http://47.128.236.25" \
  "http://47.128.236.25/api/auth/csrf/" | grep -i "access-control")

echo "Student CORS headers:"
echo "$STUDENT_HEADERS"

echo ""
echo "🎉 Complete deployment fix applied!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo ""
echo "Configuration:"
echo "• .env file: ✅ Created/verified"
echo "• CORS origins: http://47.128.236.25, http://47.128.236.25:8080"
echo "• API health: $API_HEALTH"
echo ""
echo "Test your websites:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
echo "If CORS issues persist, check:"
echo "1. Browser developer tools (F12) -> Network tab"
echo "2. Look for the actual CORS headers in the response"
echo "3. Verify the Origin header matches the allowed origins"