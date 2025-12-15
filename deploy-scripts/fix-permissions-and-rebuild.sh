#!/bin/bash

echo "🔧 Fixing Permissions and Rebuilding Frontends"
echo "=============================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Stopping services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo ""
echo "[INFO] Step 2: Fixing file permissions for build..."
# Remove existing dist directories and recreate with correct ownership
sudo rm -rf client/student-side/dist/
sudo rm -rf client/admin-side/dist/

# Ensure ubuntu user owns the client directories
sudo chown -R ubuntu:ubuntu client/

echo "[INFO] ✅ Permissions fixed"

echo ""
echo "[INFO] Step 3: Rebuilding student frontend..."
cd client/student-side
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Student frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Student frontend built successfully"

echo ""
echo "[INFO] Step 4: Rebuilding admin frontend..."
cd ../admin-side
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Admin frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Admin frontend built successfully"

cd "$PROJECT_DIR"

echo ""
echo "[INFO] Step 5: Setting proper web server permissions..."
# Now set www-data ownership for the built files
sudo chown -R www-data:www-data client/student-side/dist/
sudo chown -R www-data:www-data client/admin-side/dist/
sudo chmod -R 755 client/student-side/dist/
sudo chmod -R 755 client/admin-side/dist/

# Ensure proper permissions for the entire path
sudo chmod 755 /home
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/Update2.0_database
sudo chmod -R 755 /home/ubuntu/Update2.0_database/client

echo "[INFO] ✅ Web server permissions set"

echo ""
echo "[INFO] Step 6: Starting services..."
sudo systemctl start gunicorn
sleep 3

# Check Gunicorn status
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
echo "[INFO] Step 7: Testing authentication endpoints..."

# Test CSRF endpoint
echo "Testing CSRF endpoint..."
CSRF_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "http://47.128.236.25/api/auth/csrf/")
echo "CSRF endpoint status: $CSRF_RESPONSE"

# Test CORS for admin frontend
echo "Testing CORS for admin frontend..."
CORS_RESPONSE=$(curl -s -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,X-CSRFToken" \
  -X OPTIONS "http://47.128.236.25/api/auth/register/" \
  -w "%{http_code}" -o /dev/null)
echo "CORS preflight status: $CORS_RESPONSE"

echo ""
echo "🎉 Permissions fixed and services restarted!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo "• CSRF Endpoint: $CSRF_RESPONSE"
echo "• CORS Preflight: $CORS_RESPONSE"
echo ""
echo "Your websites should now be accessible:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""

if [ "$CSRF_RESPONSE" = "200" ] && [ "$CORS_RESPONSE" = "200" ]; then
    echo "✅ Authentication system is working!"
    echo ""
    echo "🔍 To test and resolve 403 errors:"
    echo "1. Go to http://47.128.236.25"
    echo "2. Open browser developer tools (F12)"
    echo "3. Click 'Sign Up'"
    echo "4. Use a strong password:"
    echo "   ✅ Good: 'MySecurePass123!' or 'StudentLife2024'"
    echo "   ❌ Bad: 'password123' or '12345678'"
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
    if [ "$CSRF_RESPONSE" != "200" ]; then
        echo "• CSRF endpoint not working properly (status: $CSRF_RESPONSE)"
    fi
    if [ "$CORS_RESPONSE" != "200" ]; then
        echo "• CORS configuration needs adjustment (status: $CORS_RESPONSE)"
    fi
    echo ""
    echo "Check the service logs above for more details"
fi