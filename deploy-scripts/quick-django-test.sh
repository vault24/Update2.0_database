#!/bin/bash

echo "🔍 Quick Django Configuration Test"
echo "=================================="

PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR/server"

echo "[INFO] Testing Django configuration..."

# Activate virtual environment
source venv/bin/activate

# Test Django settings
echo "1. Testing Django settings import..."
python -c "
import os
import sys
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')

try:
    import django
    from django.conf import settings
    django.setup()
    print('✅ Django settings loaded successfully')
    print(f'DEBUG: {settings.DEBUG}')
    print(f'ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}')
    print(f'CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}')
except Exception as e:
    print(f'❌ Django error: {e}')
    import traceback
    traceback.print_exc()
"

echo ""
echo "2. Testing Django check..."
python manage.py check

echo ""
echo "3. Testing WSGI application..."
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
try:
    from slms_core.wsgi import application
    print('✅ WSGI application loaded successfully')
except Exception as e:
    print(f'❌ WSGI error: {e}')
    import traceback
    traceback.print_exc()
"