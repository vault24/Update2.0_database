#!/usr/bin/env python
"""
Script to create admin users for production deployment
"""
import os
import sys
import django
from getpass import getpass

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User

def create_admin_user():
    print("🔐 Admin User Creation for Production")
    print("====================================")
    
    # Get user input
    print("\nEnter admin user details:")
    username = input("Username (default: admin): ").strip() or "admin"
    email = input("Email (default: admin@sipi.edu.bd): ").strip() or "admin@sipi.edu.bd"
    first_name = input("First Name (default: Admin): ").strip() or "Admin"
    last_name = input("Last Name (default: User): ").strip() or "User"
    
    # Choose role
    print("\nAvailable admin roles:")
    print("1. Registrar (recommended for main admin)")
    print("2. Institute Head (highest level admin)")
    
    role_choice = input("Choose role (1 or 2, default: 1): ").strip() or "1"
    role = "registrar" if role_choice == "1" else "institute_head"
    
    # Get password
    print(f"\nPassword requirements:")
    print("• At least 8 characters long")
    print("• Not too similar to username/email")
    print("• Not a commonly used password")
    print("• Not entirely numeric")
    
    while True:
        password = getpass("Enter password: ")
        password_confirm = getpass("Confirm password: ")
        
        if password != password_confirm:
            print("❌ Passwords don't match. Please try again.")
            continue
        
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long.")
            continue
        
        if password.lower() in ['password', 'admin', '12345678', 'password123']:
            print("❌ Password is too common. Please choose a stronger password.")
            continue
        
        break
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        print(f"\n⚠️ User '{username}' already exists!")
        user = User.objects.get(username=username)
        print(f"Current details:")
        print(f"• Username: {user.username}")
        print(f"• Email: {user.email}")
        print(f"• Role: {user.get_role_display()}")
        print(f"• Account Status: {user.get_account_status_display()}")
        
        update = input("\nDo you want to update this user? (y/N): ").strip().lower()
        if update == 'y':
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.role = role
            user.account_status = 'active'
            user.is_staff = True
            user.is_superuser = True
            user.set_password(password)
            user.save()
            print(f"✅ User '{username}' updated successfully!")
        else:
            print("No changes made.")
            return user
    else:
        # Create new admin user
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                account_status='active',
                is_staff=True,
                is_superuser=True
            )
            print(f"✅ Admin user created successfully!")
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            return None
    
    # Display login information
    print(f"\n🎉 Admin User Ready!")
    print(f"==================")
    print(f"Username: {username}")
    print(f"Email: {email}")
    print(f"Role: {user.get_role_display()}")
    print(f"Account Status: {user.get_account_status_display()}")
    print(f"\n🌐 Login URLs:")
    print(f"• Admin Frontend: http://47.128.236.25:8080")
    print(f"• Django Admin: http://47.128.236.25/admin/")
    print(f"\n📋 Login Credentials:")
    print(f"• Username: {username}")
    print(f"• Password: [the password you entered]")
    
    return user

def create_quick_admin():
    """Create a quick admin user with default settings"""
    print("🚀 Quick Admin Creation")
    print("======================")
    
    username = "admin"
    email = "admin@sipi.edu.bd"
    password = "AdminPass2024!"
    
    if User.objects.filter(username=username).exists():
        print(f"⚠️ User '{username}' already exists!")
        user = User.objects.get(username=username)
    else:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name="Admin",
            last_name="User",
            role="registrar",
            account_status='active',
            is_staff=True,
            is_superuser=True
        )
        print(f"✅ Quick admin user created!")
    
    print(f"\n🎉 Quick Admin Ready!")
    print(f"====================")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Role: {user.get_role_display()}")
    print(f"\n🌐 Login at: http://47.128.236.25:8080")
    
    return user

if __name__ == "__main__":
    print("Choose admin creation method:")
    print("1. Interactive (recommended)")
    print("2. Quick setup (uses default credentials)")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "2":
        create_quick_admin()
    else:
        create_admin_user()
    
    print(f"\n✨ Done! You can now login to the admin panel.")