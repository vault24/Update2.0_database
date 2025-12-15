#!/bin/bash

echo "🔧 Fixing Meta Tags and Rebuilding Frontends"
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

# Fix node_modules permissions specifically
sudo chown -R ubuntu:ubuntu client/student-side/node_modules/
sudo chown -R ubuntu:ubuntu client/admin-side/node_modules/

# Make sure vite is executable
sudo chmod +x client/student-side/node_modules/.bin/vite
sudo chmod +x client/admin-side/node_modules/.bin/vite

echo "[INFO] ✅ Permissions fixed"

echo ""
echo "[INFO] Step 3: Rebuilding student frontend with updated meta tags..."
cd client/student-side
sudo -u ubuntu npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Student frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Student frontend built successfully"

echo ""
echo "[INFO] Step 4: Rebuilding admin frontend with updated meta tags..."
cd ../admin-side
sudo -u ubuntu npm run build
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
echo "🎉 Meta tags updated and services restarted!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo ""
echo "Your websites should now show the correct preview image:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo ""
echo "📋 Important Notes:"
echo "• The preview image has been updated to your Sirajganj Polytechnic image"
echo "• Social media platforms may cache the old image for a while"
echo "• You can force refresh the cache using these tools:"
echo "  - Facebook: https://developers.facebook.com/tools/debug/"
echo "  - Twitter: https://cards-dev.twitter.com/validator"
echo "  - LinkedIn: https://www.linkedin.com/post-inspector/"
echo ""
echo "🔄 To clear social media cache:"
echo "1. Visit the debugging tools above"
echo "2. Enter your website URL: http://47.128.236.25"
echo "3. Click 'Scrape Again' or 'Fetch new scrape information'"
echo "4. The new image should appear in future shares"