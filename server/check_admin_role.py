#!/usr/bin/env python
"""
Quick script to check admin user roles
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User

# Find all admin users
admin_users = User.objects.filter(role__in=['registrar', 'institute_head'])

print("=" * 60)
print("ADMIN USERS IN DATABASE")
print("=" * 60)

if admin_users.exists():
    for user in admin_users:
        print(f"\nUsername: {user.username}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(f"Account Status: {user.account_status}")
        print(f"Is Superuser: {user.is_superuser}")
        print(f"Is Staff: {user.is_staff}")
        print("-" * 60)
else:
    print("\nNo admin users found!")
    print("\nAll users:")
    for user in User.objects.all():
        print(f"  - {user.username}: role={user.role}, status={user.account_status}")

print("\n" + "=" * 60)
