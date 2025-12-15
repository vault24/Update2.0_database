#!/bin/bash

echo "🔄 Rebuilding Frontends and Restarting Services"
echo "==============================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Stopping services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo ""
echo "[INFO] Step 2: Rebuilding student frontend..."
cd client/student-side
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Student frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Student frontend built successfully"

echo ""
echo "[INFO] Step 3: Rebuilding admin frontend..."
cd ../admin-side
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Admin frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Admin frontend built successfully"

cd "$PROJECT_DIR"

echo ""
echo "[INFO] Step 4: Setting file permissions..."
sudo chown -R www-data:www-data client/student-side/dist/
sudo chown -R www-data:www-data client/admin-side/dist/
sudo chmod -R 755 client/student-side/dist/
sudo chmod -R 755 client/admin-side/dist/

echo ""
echo "[INFO] Step 5: Starting services..."
sudo systemctl start gunicorn
sleep 3
sudo systemctl start nginx
sleep 2

echo ""
echo "[INFO] Step 6: Checking service status..."
GUNICORN_STATUS=$(sudo systemctl is-active gunicorn)
NGINX_STATUS=$(sudo systemctl is-active nginx)

echo "• Gunicorn: $GUNICORN_STATUS"
echo "• NGINX: $NGINX_STATUS"

if [ "$GUNICORN_STATUS" = "active" ] && [ "$NGINX_STATUS" = "active" ]; then
    echo ""
    echo "✅ Services restarted successfully!"
    echo ""
    echo "🌐 Your websites:"
    echo "• Student Frontend: http://47.128.236.25"
    echo "• Admin Frontend: http://47.128.236.25:8080"
    echo ""
    echo "🔍 Test authentication:"
    echo "1. Go to http://47.128.236.25"
    echo "2. Try signing up with a strong password (8+ chars, not common)"
    echo "3. After signup, you should be automatically logged in"
    echo "4. The 403 Forbidden errors should be resolved"
else
    echo ""
    echo "❌ Service startup failed!"
    if [ "$GUNICORN_STATUS" != "active" ]; then
        echo "Gunicorn logs:"
        sudo journalctl -u gunicorn --no-pager -l --since "2 minutes ago"
    fi
    if [ "$NGINX_STATUS" != "active" ]; then
        echo "NGINX logs:"
        sudo journalctl -u nginx --no-pager -l --since "1 minute ago"
    fi
fi