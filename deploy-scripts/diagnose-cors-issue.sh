#!/bin/bash

echo "🔍 CORS Issue Diagnosis"
echo "======================"

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR"

echo "[INFO] Step 1: Checking service status..."
echo "Gunicorn: $(sudo systemctl is-active gunicorn)"
echo "NGINX: $(sudo systemctl is-active nginx)"

echo ""
echo "[INFO] Step 2: Checking .env file..."
if [ -f "server/.env" ]; then
    echo "✅ .env file exists"
    echo "CORS_ALLOWED_ORIGINS in .env:"
    grep "CORS_ALLOWED_ORIGINS" server/.env || echo "Not found in .env"
else
    echo "❌ .env file missing!"
fi

echo ""
echo "[INFO] Step 3: Testing API endpoint directly..."
API_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "http://47.128.236.25/api/auth/csrf/")
echo "Direct API test: $API_RESPONSE"

echo ""
echo "[INFO] Step 4: Testing CORS preflight for admin frontend..."
echo "Request: OPTIONS http://47.128.236.25/api/auth/csrf/ with Origin: http://47.128.236.25:8080"

CORS_RESPONSE=$(curl -s -i -H "Origin: http://47.128.236.25:8080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "http://47.128.236.25/api/auth/csrf/")

echo "Full CORS response:"
echo "$CORS_RESPONSE"

echo ""
echo "[INFO] Step 5: Testing actual GET request with Origin header..."
GET_RESPONSE=$(curl -s -i -H "Origin: http://47.128.236.25:8080" \
  "http://47.128.236.25/api/auth/csrf/")

echo "GET request with Origin header:"
echo "$GET_RESPONSE"

echo ""
echo "[INFO] Step 6: Checking Django logs for CORS-related errors..."
echo "Recent Gunicorn logs:"
sudo journalctl -u gunicorn --no-pager -l --since "5 minutes ago" | tail -20

echo ""
echo "[INFO] Step 7: Checking NGINX configuration..."
echo "Active NGINX sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "NGINX configuration for API proxy:"
if [ -f "/etc/nginx/sites-enabled/slms-clean" ]; then
    grep -A 5 -B 5 "location /api" /etc/nginx/sites-enabled/slms-clean
else
    echo "No slms-clean configuration found"
fi