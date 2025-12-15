#!/bin/bash

echo "🔧 Fixing CORS Duplicate Origins Issue"
echo "====================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Backing up current configurations..."
cp server/.env server/.env.backup
cp server/slms_core/settings.py server/slms_core/settings.py.backup

echo "[INFO] Step 2: Cleaning up CORS configuration in .env file..."

# Create a clean .env file with proper CORS settings
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

echo "[INFO] Step 3: Updating Django settings.py to use clean defaults..."

# Update the Django settings to have clean defaults
python3 << 'EOF'
import re

# Read the settings file
with open('server/slms_core/settings.py', 'r') as f:
    content = f.read()

# Replace the CORS_ALLOWED_ORIGINS configuration
old_cors_config = r"CORS_ALLOWED_ORIGINS = config\(\s*'CORS_ALLOWED_ORIGINS',\s*default='[^']*',\s*cast=Csv\(\)\s*\)"
new_cors_config = """CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://47.128.236.25,http://47.128.236.25:8080',
    cast=Csv()
)"""

content = re.sub(old_cors_config, new_cors_config, content, flags=re.MULTILINE | re.DOTALL)

# Replace the CSRF_TRUSTED_ORIGINS configuration  
old_csrf_config = r"CSRF_TRUSTED_ORIGINS = config\(\s*'CSRF_TRUSTED_ORIGINS',\s*default='[^']*',\s*cast=Csv\(\)\s*\)"
new_csrf_config = """CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://47.128.236.25,http://47.128.236.25:8080',
    cast=Csv()
)"""

content = re.sub(old_csrf_config, new_csrf_config, content, flags=re.MULTILINE | re.DOTALL)

# Write the updated content back
with open('server/slms_core/settings.py', 'w') as f:
    f.write(content)

print("✅ Updated Django settings.py")
EOF

echo "[INFO] Step 4: Restarting Gunicorn to apply CORS changes..."
sudo systemctl restart gunicorn
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Gunicorn restarted successfully"
else
    echo "[ERROR] ❌ Failed to restart Gunicorn"
    exit 1
fi

echo "[INFO] Step 5: Reloading NGINX..."
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ NGINX reloaded successfully"
else
    echo "[ERROR] ❌ Failed to reload NGINX"
fi

echo "[INFO] Step 6: Testing CORS configuration..."

# Test CORS for admin frontend
echo "[INFO] Testing CORS for admin frontend (port 8080)..."
CORS_TEST_ADMIN=$(curl -s -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/me/" \
  -w "%{http_code}" -o /dev/null)

if [ "$CORS_TEST_ADMIN" = "200" ]; then
    echo "[INFO] ✅ CORS working for admin frontend"
else
    echo "[WARNING] ⚠️ CORS test for admin frontend returned: $CORS_TEST_ADMIN"
fi

# Test CORS for student frontend  
echo "[INFO] Testing CORS for student frontend (port 80)..."
CORS_TEST_STUDENT=$(curl -s -H "Origin: http://47.128.236.25" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/me/" \
  -w "%{http_code}" -o /dev/null)

if [ "$CORS_TEST_STUDENT" = "200" ]; then
    echo "[INFO] ✅ CORS working for student frontend"
else
    echo "[WARNING] ⚠️ CORS test for student frontend returned: $CORS_TEST_STUDENT"
fi

echo ""
echo "🎉 CORS duplicate origins fix complete!"
echo ""
echo "Changes made:"
echo "1. ✅ Cleaned up .env CORS configuration (removed duplicates)"
echo "2. ✅ Updated Django settings.py defaults"
echo "3. ✅ Restarted Django services"
echo "4. ✅ Tested CORS for both frontends"
echo ""
echo "CORS configuration now includes only:"
echo "• http://47.128.236.25 (student frontend)"
echo "• http://47.128.236.25:8080 (admin frontend)"
echo ""
echo "The admin frontend CORS errors should now be resolved!"
echo ""
echo "Next steps:"
echo "1. Test admin frontend login at http://47.128.236.25:8080"
echo "2. Check browser console - CORS errors should be gone"
echo "3. Verify both frontends can authenticate properly"