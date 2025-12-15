#!/bin/bash

echo "🔧 Fixing Social Media Preview Image"
echo "===================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Creating a local preview image directory..."
mkdir -p client/student-side/public/images
mkdir -p client/admin-side/public/images

echo "[INFO] Step 2: Downloading your institution image..."
# Download the image locally so social media can access it reliably
wget -O client/student-side/public/images/sipi-preview.jpg "https://sirajganj.polytech.gov.bd/sites/default/files/files/sirajganj.polytech.gov.bd/front_service_box/e387aead_a9af_45f9_9ee2_9370df4b3adc/2023-11-26-06-01-8a3a69dad241d03fa2d90591acc61342.jpeg" 2>/dev/null || echo "Could not download image, using fallback"

# Copy to admin side as well
cp client/student-side/public/images/sipi-preview.jpg client/admin-side/public/images/sipi-preview.jpg 2>/dev/null || echo "Using fallback image"

echo "[INFO] Step 3: Updating meta tags to use local image..."

# Update student-side HTML
cat > client/student-side/index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sirajganj Polytechnic Institute - Student Portal</title>
    <meta name="description" content="Access your academic journey, manage admissions, track progress at Sirajganj Polytechnic Institute Student Portal" />
    <meta name="author" content="Sirajganj Polytechnic Institute" />
    <meta name="keywords" content="Sirajganj Polytechnic, Student Portal, Admission, Bangladesh, Technical Education" />

    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="Sirajganj Polytechnic Institute - Student Portal" />
    <meta property="og:description" content="Modern student portal for admission, academic tracking, and institutional management at Sirajganj Polytechnic Institute" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="http://47.128.236.25/" />
    <meta property="og:image" content="http://47.128.236.25/images/sipi-preview.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Sirajganj Polytechnic Institute - Student Portal" />
    <meta property="og:site_name" content="Sirajganj Polytechnic Institute" />

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@SPI_BD" />
    <meta name="twitter:title" content="Sirajganj Polytechnic Institute - Student Portal" />
    <meta name="twitter:description" content="Modern student portal for admission, academic tracking, and institutional management" />
    <meta name="twitter:image" content="http://47.128.236.25/images/sipi-preview.jpg" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="canonical" href="http://47.128.236.25/" />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Update admin-side HTML
cat > client/admin-side/index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sirajganj Polytechnic Institute - Admin Panel</title>
    <meta name="description" content="Administrative panel for managing Sirajganj Polytechnic Institute operations" />
    <meta name="author" content="Sirajganj Polytechnic Institute" />

    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="Sirajganj Polytechnic Institute - Admin Panel" />
    <meta property="og:description" content="Administrative panel for managing Sirajganj Polytechnic Institute operations" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="http://47.128.236.25:8080/" />
    <meta property="og:image" content="http://47.128.236.25/images/sipi-preview.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Sirajganj Polytechnic Institute - Admin Panel" />
    <meta property="og:site_name" content="Sirajganj Polytechnic Institute" />

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@SPI_BD" />
    <meta name="twitter:title" content="Sirajganj Polytechnic Institute - Admin Panel" />
    <meta name="twitter:description" content="Administrative panel for managing Sirajganj Polytechnic Institute operations" />
    <meta name="twitter:image" content="http://47.128.236.25/images/sipi-preview.jpg" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

echo "[INFO] Step 4: Stopping services..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

echo "[INFO] Step 5: Fixing file permissions for build..."
# Remove existing dist directories and recreate with correct ownership
sudo rm -rf client/student-side/dist/
sudo rm -rf client/admin-side/dist/

# Ensure ubuntu user owns the client directories
sudo chown -R ubuntu:ubuntu client/

# Fix node_modules permissions specifically
sudo chown -R ubuntu:ubuntu client/student-side/node_modules/ 2>/dev/null || echo "Node modules not found"
sudo chown -R ubuntu:ubuntu client/admin-side/node_modules/ 2>/dev/null || echo "Node modules not found"

# Make sure vite is executable
sudo chmod +x client/student-side/node_modules/.bin/vite 2>/dev/null || echo "Vite not found in student-side"
sudo chmod +x client/admin-side/node_modules/.bin/vite 2>/dev/null || echo "Vite not found in admin-side"

echo "[INFO] Step 6: Rebuilding student frontend..."
cd client/student-side
sudo -u ubuntu npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Student frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Student frontend built successfully"

echo "[INFO] Step 7: Rebuilding admin frontend..."
cd ../admin-side
sudo -u ubuntu npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Admin frontend build failed"
    exit 1
fi
echo "[INFO] ✅ Admin frontend built successfully"

cd "$PROJECT_DIR"

echo "[INFO] Step 8: Setting proper web server permissions..."
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

echo "[INFO] Step 9: Starting services..."
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
echo "🎉 Social media preview image updated!"
echo ""
echo "Service Status:"
echo "• Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "• NGINX: $(sudo systemctl is-active nginx)"
echo ""
echo "Your websites should now show the correct preview image:"
echo "🎓 Student Frontend: http://47.128.236.25"
echo "👨‍💼 Admin Frontend: http://47.128.236.25:8080"
echo "🖼️  Preview Image: http://47.128.236.25/images/sipi-preview.jpg"
echo ""
echo "📋 IMPORTANT: Clear social media cache using these tools:"
echo "• Facebook: https://developers.facebook.com/tools/debug/"
echo "• Twitter: https://cards-dev.twitter.com/validator"
echo "• LinkedIn: https://www.linkedin.com/post-inspector/"
echo ""
echo "🔄 Steps to clear cache:"
echo "1. Visit the debugging tools above"
echo "2. Enter your website URL: http://47.128.236.25"
echo "3. Click 'Scrape Again' or 'Fetch new scrape information'"
echo "4. The new image should appear in future shares"
echo ""
echo "✅ If the image still doesn't work, try using a different image URL"
echo "   or upload your institution logo to a reliable image hosting service."