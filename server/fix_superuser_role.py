#!/usr/bin/env python
"""
Script to fix superuser role for admin access
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User

def fix_superuser_role():
    """Fix superuser role to allow admin access"""
    
    # Find superusers
    superusers = User.objects.filter(is_superuser=True)
    
    if not superusers.exists():
        print("No superusers found!")
        return
    
    print(f"Found {superusers.count()} superuser(s):")
    
    for user in superusers:
        print(f"\nUser: {user.username}")
        print(f"Current role: {user.role}")
        print(f"Email: {user.email}")
        print(f"Account status: {user.account_status}")
        
        # Update role to registrar if it's not already an admin role
        if user.role not in ['registrar', 'institute_head']:
            user.role = 'registrar'
            user.account_status = 'active'
            user.save()
            print(f"✅ Updated role to 'registrar' and status to 'active'")
        else:
            print(f"✅ Role is already an admin role: {user.role}")
    
    print(f"\n🎉 All superusers are now configured for admin access!")
    print(f"You can now login to the admin panel with your superuser credentials.")

if __name__ == '__main__':
    fix_superuser_role()