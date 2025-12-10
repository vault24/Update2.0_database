#!/usr/bin/env python
"""
Script to create an admin user for testing
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User

# Create admin user
username = 'admin'
email = 'admin@sipi.edu.bd'
password = 'admin123'
role = 'registrar'

# Check if user already exists
if User.objects.filter(username=username).exists():
    print(f"User '{username}' already exists!")
    user = User.objects.get(username=username)
    print(f"Username: {user.username}")
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    print(f"Account Status: {user.account_status}")
else:
    # Create new admin user
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name='Admin',
        last_name='User',
        role=role,
        account_status='active',
        is_staff=True,
        is_superuser=True
    )
    print(f"Admin user created successfully!")
    print(f"Username: {username}")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Role: {role}")
    print(f"\nYou can now login at http://localhost:8081/auth")
