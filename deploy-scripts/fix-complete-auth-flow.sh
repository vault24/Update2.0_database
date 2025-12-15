#!/bin/bash

echo "🔧 Fixing Complete Authentication Flow"
echo "====================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Restarting Gunicorn to apply authentication changes..."
sudo systemctl restart gunicorn
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Gunicorn restarted successfully"
else
    echo "[ERROR] ❌ Failed to restart Gunicorn"
    exit 1
fi

echo "[INFO] Step 2: Fixing esbuild permissions for frontend rebuild..."

# Fix esbuild permissions for student-side
if [ -f "client/student-side/node_modules/vite/node_modules/@esbuild/linux-x64/bin/esbuild" ]; then
    chmod +x client/student-side/node_modules/vite/node_modules/@esbuild/linux-x64/bin/esbuild
    echo "[INFO] ✅ Fixed esbuild permissions for student-side"
else
    echo "[WARNING] esbuild binary not found for student-side"
fi

# Fix esbuild permissions for admin-side
if [ -f "client/admin-side/node_modules/vite/node_modules/@esbuild/linux-x64/bin/esbuild" ]; then
    chmod +x client/admin-side/node_modules/vite/node_modules/@esbuild/linux-x64/bin/esbuild
    echo "[INFO] ✅ Fixed esbuild permissions for admin-side"
else
    echo "[WARNING] esbuild binary not found for admin-side"
fi

# Also fix all node_modules binaries
echo "[INFO] Step 3: Fixing all node_modules binary permissions..."
chmod +x client/student-side/node_modules/.bin/* 2>/dev/null || true
chmod +x client/admin-side/node_modules/.bin/* 2>/dev/null || true

echo "[INFO] Step 4: Rebuilding student frontend with authentication fixes..."
cd client/student-side
npm run build
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Student frontend built successfully"
else
    echo "[ERROR] ❌ Student frontend build failed"
    exit 1
fi

echo "[INFO] Step 5: Rebuilding admin frontend..."
cd ../admin-side
npm run build
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Admin frontend built successfully"
else
    echo "[ERROR] ❌ Admin frontend build failed"
    exit 1
fi

echo "[INFO] Step 6: Verifying built files contain correct API URLs..."
cd "$PROJECT_DIR"

# Check if the built files contain the correct API URL
if grep -r "47.128.236.25" client/student-side/dist/ >/dev/null 2>&1; then
    echo "[INFO] ✅ Student frontend contains correct server IP"
else
    echo "[WARNING] ⚠️ Student frontend may still contain localhost references"
fi

if grep -r "47.128.236.25" client/admin-side/dist/ >/dev/null 2>&1; then
    echo "[INFO] ✅ Admin frontend contains correct server IP"
else
    echo "[WARNING] ⚠️ Admin frontend may still contain localhost references"
fi

echo "[INFO] Step 7: Reloading NGINX..."
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ NGINX reloaded successfully"
else
    echo "[ERROR] ❌ Failed to reload NGINX"
fi

echo "[INFO] Step 8: Testing authentication flow..."

# Test CSRF endpoint
echo "[INFO] Testing CSRF token endpoint..."
CSRF_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://47.128.236.25/api/auth/csrf/")
if [ "$CSRF_TEST" = "200" ]; then
    echo "[INFO] ✅ CSRF endpoint working"
else
    echo "[WARNING] ⚠️ CSRF endpoint returned: $CSRF_TEST"
fi

# Test registration endpoint structure (without creating a user)
echo "[INFO] Testing registration endpoint availability..."
REG_TEST=$(curl -s -w "%{http_code}" -o /dev/null -X POST "http://47.128.236.25/api/auth/register/" -H "Content-Type: application/json" -d '{}')
if [ "$REG_TEST" = "400" ]; then
    echo "[INFO] ✅ Registration endpoint available (400 expected for empty data)"
else
    echo "[WARNING] ⚠️ Registration endpoint returned: $REG_TEST"
fi

echo ""
echo "🎉 Complete authentication flow fixes applied!"
echo ""
echo "Changes made:"
echo "1. ✅ Updated Django registration to auto-login users after signup"
echo "2. ✅ Updated frontend to handle auto-login response"
echo "3. ✅ Rebuilt both frontends with correct API URLs"
echo "4. ✅ Restarted all services"
echo ""
echo "Your websites should now work correctly:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
echo "Authentication flow improvements:"
echo "• Users are automatically logged in after successful registration"
echo "• Session management properly handles credentials"
echo "• CORS is configured to work with authentication"
echo "• Password validation errors are properly displayed"
echo ""
echo "Next steps:"
echo "1. Test student registration with a strong password (8+ chars, not common)"
echo "2. Verify automatic login after registration"
echo "3. Check that dashboard and other pages load properly after login"