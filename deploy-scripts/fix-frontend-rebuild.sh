#!/bin/bash

echo "🔧 Fixing Frontend Build Issues and Rebuilding"
echo "=============================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Fixing esbuild permissions for both frontends..."

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
echo "[INFO] Step 2: Fixing all node_modules binary permissions..."
chmod +x client/student-side/node_modules/.bin/* 2>/dev/null || true
chmod +x client/admin-side/node_modules/.bin/* 2>/dev/null || true

echo "[INFO] Step 3: Rebuilding student frontend with correct API URL..."
cd client/student-side
npm run build
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Student frontend built successfully"
else
    echo "[ERROR] ❌ Student frontend build failed"
    exit 1
fi

echo "[INFO] Step 4: Rebuilding admin frontend with correct API URL..."
cd ../admin-side
npm run build
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Admin frontend built successfully"
else
    echo "[ERROR] ❌ Admin frontend build failed"
    exit 1
fi

echo "[INFO] Step 5: Verifying built files contain correct API URLs..."
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

echo "[INFO] Step 6: Restarting Gunicorn to apply Django CORS changes..."
sudo systemctl restart gunicorn
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ Gunicorn restarted successfully"
else
    echo "[ERROR] ❌ Failed to restart Gunicorn"
fi

echo "[INFO] Step 7: Reloading NGINX..."
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "[INFO] ✅ NGINX reloaded successfully"
else
    echo "[ERROR] ❌ Failed to reload NGINX"
fi

echo ""
echo "🎉 Frontend rebuild complete!"
echo ""
echo "Your websites should now work correctly:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
echo "Both frontends should now connect to: http://47.128.236.25/api"
echo ""
echo "Next steps:"
echo "1. Open both websites in your browser"
echo "2. Check browser console (F12) - CORS errors should be resolved"
echo "3. Try logging in to test API connectivity"