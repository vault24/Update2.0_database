#!/bin/bash

echo "🔐 Complete Authentication Fix"
echo "============================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Stopping services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo ""
echo "[INFO] Step 2: Fixing Django settings..."

# Fix the ALLOWED_HOSTS syntax error in settings.py
sed -i "s/ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,47.128.236.25,ec2-47-128-236-25.ap-southeast-1.compute.amazonaws.com,47.128.236.25:8000, cast=Csv())/ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,47.128.236.25,ec2-47-128-236-25.ap-southeast-1.compute.amazonaws.com,47.128.236.25:8000', cast=Csv())/" server/slms_core/settings.py

echo "[INFO] ✅ Fixed Django settings syntax error"

echo ""
echo "[INFO] Step 3: Ensuring correct .env configuration..."
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

echo "[INFO] ✅ Updated .env file"

echo ""
echo "[INFO] Step 4: Ensuring correct frontend .env files..."

# Student frontend .env
cat > client/student-side/.env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://47.128.236.25/api
EOF

# Admin frontend .env
cat > client/admin-side/.env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://47.128.236.25/api
EOF

echo "[INFO] ✅ Updated frontend .env files"

echo ""
echo "[INFO] Step 5: Testing Django configuration..."
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
    echo "[ERROR] Django configuration has errors"
    exit 1
fi

echo ""
echo "[INFO] Step 6: Testing authentication endpoints..."
python manage.py shell << 'EOF'
from apps.authentication.models import User
from django.contrib.auth import authenticate

# Test user creation and authentication
print("Testing authentication system...")

# Check if we can create a test user
try:
    test_user = User.objects.filter(username='test_auth_user').first()
    if test_user:
        test_user.delete()
    
    test_user = User.objects.create_user(
        username='test_auth_user',
        email='test@example.com',
        password='testpass123',
        role='student'
    )
    print(f"✅ User creation successful: {test_user}")
    
    # Test authentication
    auth_user = authenticate(username='test_auth_user', password='testpass123')
    if auth_user:
        print("✅ Authentication successful")
    else:
        print("❌ Authentication failed")
    
    # Clean up
    test_user.delete()
    print("✅ Test user cleaned up")
    
except Exception as e:
    print(f"❌ Authentication test failed: {e}")

print("Authentication system test complete")
EOF

echo ""
echo "[INFO] Step 7: Rebuilding frontends with correct API URLs..."
cd "$PROJECT_DIR"

# Rebuild student frontend
echo "Building student frontend..."
cd client/student-side
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Student frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Student frontend built successfully"

# Rebuild admin frontend
echo "Building admin frontend..."
cd ../admin-side
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Admin frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Admin frontend built successfully"

cd "$PROJECT_DIR"

echo ""
echo "[INFO] Step 8: Setting up proper file permissions..."
# Ensure www-data can access the built files
sudo chown -R www-data:www-data client/student-side/dist/
sudo chown -R www-data:www-data client/admin-side/dist/
sudo chmod -R 755 client/student-side/dist/
sudo chmod -R 755 client/admin-side/dist/

# Ensure proper permissions for the entire path
sudo chmod 755 /home
sudo chmod 755 /home/ubuntu
sudo chmod 755 /home/ubuntu/Update2.0_database
sudo chmod -R 755 /home/ubuntu/Update2.0_database/client

echo "[INFO] ✅ File permissions set"

echo ""
echo "[INFO] Step 9: Starting services..."
sudo systemctl start gunicorn
sleep 5

# Check Gunicorn status
if sudo systemctl is-active --quiet gunicorn; then
    echo "[INFO] ✅ Gunicorn started successfully"
else
    echo "[ERROR] ❌ Gunicorn failed to start"
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
echo "[INFO] Step 10: Testing authentication flow..."

# Test CSRF endpoint
echo "Testing CSRF endpoint..."
CSRF_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://47.128.236.25/api/auth/csrf/")
echo "CSRF endpoint: $CSRF_TEST"

# Test registration endpoint
echo "Testing registration endpoint..."
REG_TEST=$(curl -s -w "%{http_code}" -o /dev/null -X POST "http://47.128.236.25/api/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"testpass123","password_confirm":"testpass123","first_name":"Test","last_name":"User","role":"student","mobile_number":"01234567890"}')
echo "Registration endpoint: $REG_TEST"

# Test CORS for admin frontend
echo "Testing CORS for admin frontend..."
CORS_TEST=$(curl -s -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS "http://47.128.236.25/api/auth/csrf/" \
  -w "%{http_code}" -o /dev/null)
echo "CORS test: $CORS_TEST"

echo ""
echo "🎉 Authentication fix complete!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo "• CSRF Endpoint: $CSRF_TEST"
echo "• Registration Test: $REG_TEST"
echo "• CORS Test: $CORS_TEST"
echo ""
echo "Your websites should now be accessible:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
if [ "$CSRF_TEST" = "200" ] && [ "$CORS_TEST" = "200" ]; then
    echo "✅ Authentication system is working!"
    echo ""
    echo "🔍 To test signup:"
    echo "1. Go to http://47.128.236.25"
    echo "2. Click 'Sign Up'"
    echo "3. Fill the form with a strong password (8+ chars, not common)"
    echo "4. After signup, you should be automatically logged in"
    echo "5. API calls should now work without 403 errors"
else
    echo "⚠️ Some issues remain - check the logs above"
fi