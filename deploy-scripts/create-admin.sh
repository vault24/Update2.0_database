#!/bin/bash

echo "👨‍💼 Creating Admin User for Admin Panel"
echo "======================================="

# Set project directory
PROJECT_DIR="/home/ubuntu/Update2.0_database"
cd "$PROJECT_DIR/server"

# Activate virtual environment
source venv/bin/activate

echo ""
echo "Choose admin creation method:"
echo "1. Quick setup (recommended for testing)"
echo "2. Interactive setup (custom credentials)"
echo ""

read -p "Enter choice (1 or 2, default: 1): " choice
choice=${choice:-1}

if [ "$choice" = "2" ]; then
    echo ""
    echo "Running interactive admin creation..."
    python create_production_admin.py
else
    echo ""
    echo "Creating quick admin user..."
    python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User

username = 'admin'
email = 'admin@sipi.edu.bd'
password = 'AdminPass2024!'

if User.objects.filter(username=username).exists():
    print(f'⚠️ User \"{username}\" already exists!')
    user = User.objects.get(username=username)
    # Update existing user to ensure it has admin privileges
    user.role = 'registrar'
    user.account_status = 'active'
    user.is_staff = True
    user.is_superuser = True
    user.set_password(password)
    user.save()
    print(f'✅ Updated existing admin user!')
else:
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name='Admin',
        last_name='User',
        role='registrar',
        account_status='active',
        is_staff=True,
        is_superuser=True
    )
    print(f'✅ Admin user created successfully!')

print(f'')
print(f'🎉 Admin User Ready!')
print(f'==================')
print(f'Username: {username}')
print(f'Password: {password}')
print(f'Role: {user.get_role_display()}')
print(f'')
print(f'🌐 Login URLs:')
print(f'• Admin Frontend: http://47.128.236.25:8080')
print(f'• Django Admin: http://47.128.236.25/admin/')
print(f'')
print(f'📋 Login Steps:')
print(f'1. Go to http://47.128.236.25:8080')
print(f'2. Click \"Login\"')
print(f'3. Enter username: admin')
print(f'4. Enter password: AdminPass2024!')
print(f'5. You should now have full admin access!')
"
fi

echo ""
echo "✨ Admin user setup complete!"
echo ""
echo "🔍 Next steps:"
echo "1. Go to http://47.128.236.25:8080"
echo "2. Login with the credentials shown above"
echo "3. You'll have access to:"
echo "   • Student management"
echo "   • Teacher management" 
echo "   • Admissions management"
echo "   • System settings"
echo "   • Analytics and reports"