#!/bin/bash

echo "🔐 Server Authentication Fix - AWS Deployment"
echo "============================================="

# Set project directory for AWS server
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Stopping services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo ""
echo "[INFO] Step 2: Fixing Django settings syntax error..."
# Fix the ALLOWED_HOSTS syntax error that's causing Django to fail
sed -i "s/47.128.236.25:8000, cast=Csv())/47.128.236.25:8000', cast=Csv())/" server/slms_core/settings.py

echo "[INFO] ✅ Fixed Django settings"

echo ""
echo "[INFO] Step 3: Updating server .env configuration..."
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

# CORS Settings - Allow both student and admin frontends
CORS_ALLOWED_ORIGINS=http://47.128.236.25,http://47.128.236.25:8080

# CSRF Settings - Allow both student and admin frontends
CSRF_TRUSTED_ORIGINS=http://47.128.236.25,http://47.128.236.25:8080
EOF

echo "[INFO] ✅ Updated server .env file"

echo ""
echo "[INFO] Step 4: Updating frontend .env files..."

# Student frontend .env - correct API URL
cat > client/student-side/.env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://47.128.236.25/api
EOF

# Admin frontend .env - correct API URL
cat > client/admin-side/.env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://47.128.236.25/api
EOF

echo "[INFO] ✅ Updated frontend .env files"

echo ""
echo "[INFO] Step 5: Testing Django configuration..."
cd server
source venv/bin/activate

echo "Testing Django settings..."
python -c "
import os
import sys
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
try:
    import django
    django.setup()
    print('✅ Django settings loaded successfully')
    
    # Test CORS settings
    from django.conf import settings
    print(f'CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}')
    print(f'CSRF_TRUSTED_ORIGINS: {settings.CSRF_TRUSTED_ORIGINS}')
    print(f'ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}')
    
except Exception as e:
    print(f'❌ Django settings error: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "[ERROR] Django configuration has errors"
    exit 1
fi

echo ""
echo "[INFO] Step 6: Creating CSRF token endpoint fix..."
# Ensure CSRF endpoint is working properly
python manage.py shell << 'EOF'
from django.test import Client
from django.urls import reverse

# Test CSRF endpoint
client = Client()
try:
    response = client.get('/api/auth/csrf/')
    print(f"CSRF endpoint status: {response.status_code}")
    if response.status_code == 200:
        print("✅ CSRF endpoint working")
    else:
        print(f"❌ CSRF endpoint failed: {response.content}")
except Exception as e:
    print(f"❌ CSRF test error: {e}")
EOF

echo ""
echo "[INFO] Step 7: Rebuilding frontends with correct API URLs..."
cd "$PROJECT_DIR"

# Install dependencies and rebuild student frontend
echo "Building student frontend..."
cd client/student-side
npm install --silent
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Student frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Student frontend built successfully"

# Install dependencies and rebuild admin frontend
echo "Building admin frontend..."
cd ../admin-side
npm install --silent
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Admin frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Admin frontend built successfully"

cd "$PROJECT_DIR"

echo ""
echo "[INFO] Step 8: Setting proper file permissions..."
# Ensure www-data can access all files
sudo chown -R www-data:www-data client/student-side/dist/
sudo chown -R www-data:www-data client/admin-side/dist/
sudo chmod -R 755 client/student-side/dist/
sudo chmod -R 755 client/admin-side/dist/

# Fix directory permissions up the path
sudo chmod 755 /home
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/Update2.0_database
sudo chmod -R 755 /home/ubuntu/Update2.0_database/client

echo "[INFO] ✅ File permissions set"

echo ""
echo "[INFO] Step 9: Starting services..."
sudo systemctl start gunicorn
sleep 5

# Check Gunicorn status with detailed logging
if sudo systemctl is-active --quiet gunicorn; then
    echo "[INFO] ✅ Gunicorn started successfully"
else
    echo "[ERROR] ❌ Gunicorn failed to start"
    echo "Gunicorn logs:"
    sudo journalctl -u gunicorn --no-pager -l --since "2 minutes ago"
    exit 1
fi

sudo systemctl start nginx
sleep 2

if sudo systemctl is-active --quiet nginx; then
    echo "[INFO] ✅ NGINX started successfully"
else
    echo "[ERROR] ❌ NGINX failed to start"
    echo "NGINX logs:"
    sudo journalctl -u nginx --no-pager -l --since "1 minute ago"
    exit 1
fi

echo ""
echo "[INFO] Step 10: Testing authentication endpoints..."

# Test CSRF endpoint
echo "Testing CSRF endpoint..."
CSRF_RESPONSE=$(curl -s -i "http://47.128.236.25/api/auth/csrf/")
CSRF_STATUS=$(echo "$CSRF_RESPONSE" | head -n1 | cut -d' ' -f2)
echo "CSRF endpoint status: $CSRF_STATUS"

# Test CORS preflight for admin frontend
echo "Testing CORS preflight for admin frontend..."
CORS_RESPONSE=$(curl -s -i -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,X-CSRFToken" \
  -X OPTIONS "http://47.128.236.25/api/auth/register/")
CORS_STATUS=$(echo "$CORS_RESPONSE" | head -n1 | cut -d' ' -f2)
echo "CORS preflight status: $CORS_STATUS"

# Check if Access-Control-Allow-Origin header is present
CORS_HEADER=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" || echo "Not found")
echo "CORS header: $CORS_HEADER"

echo ""
echo "🎉 Server authentication fix complete!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo "• CSRF Endpoint: $CSRF_STATUS"
echo "• CORS Preflight: $CORS_STATUS"
echo ""
echo "Your websites should now be accessible:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""

if [ "$CSRF_STATUS" = "200" ] && [ "$CORS_STATUS" = "200" ]; then
    echo "✅ Authentication system is working!"
    echo ""
    echo "🔍 To test signup and fix 403 errors:"
    echo "1. Go to http://47.128.236.25"
    echo "2. Open browser developer tools (F12)"
    echo "3. Click 'Sign Up'"
    echo "4. Use a strong password (8+ characters, not common like 'password123')"
    echo "5. After successful signup, you should be automatically logged in"
    echo "6. The 403 Forbidden errors should be resolved"
    echo ""
    echo "📋 Password Requirements:"
    echo "• At least 8 characters long"
    echo "• Not too similar to your personal information"
    echo "• Not a commonly used password"
    echo "• Not entirely numeric"
else
    echo "⚠️ Some issues remain:"
    if [ "$CSRF_STATUS" != "200" ]; then
        echo "• CSRF endpoint not working properly"
    fi
    if [ "$CORS_STATUS" != "200" ]; then
        echo "• CORS configuration needs adjustment"
    fi
    echo ""
    echo "Check the service logs above for more details"
fi