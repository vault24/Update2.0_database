#!/usr/bin/env python
"""
Script to update existing admin user
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User

# Update admin user
username = 'admin'

try:
    user = User.objects.get(username=username)
    user.role = 'registrar'
    user.email = 'admin@sipi.edu.bd'
    user.account_status = 'active'
    user.is_staff = True
    user.is_superuser = True
    user.set_password('admin123')
    user.save()
    
    print(f"Admin user updated successfully!")
    print(f"Username: {user.username}")
    print(f"Email: {user.email}")
    print(f"Password: admin123")
    print(f"Role: {user.role}")
    print(f"Account Status: {user.account_status}")
    print(f"\nYou can now login at http://localhost:8081/auth")
except User.DoesNotExist:
    print(f"User '{username}' not found!")
