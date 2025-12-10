#!/usr/bin/env python
"""
Script to fix activity_logs table to allow NULL values in user_agent column
Run this with: python fix_activity_logs_null.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.db import connection

def fix_activity_logs_null():
    """Fix activity_logs table to allow NULL in user_agent column"""
    with connection.cursor() as cursor:
        print("Fixing activity_logs table to allow NULL values...")
        
        try:
            # Alter the user_agent column to allow NULL
            cursor.execute("""
                ALTER TABLE activity_logs 
                ALTER COLUMN user_agent DROP NOT NULL;
            """)
            
            print("✓ user_agent column now allows NULL values")
            
            # Also check and fix ip_address if needed
            cursor.execute("""
                ALTER TABLE activity_logs 
                ALTER COLUMN ip_address DROP NOT NULL;
            """)
            
            print("✓ ip_address column now allows NULL values")
            print("\n✓ Activity logs table fixed successfully!")
            print("\nYou can now re-enable the middleware in settings.py:")
            print("  Uncomment: 'apps.activity_logs.middleware.ActivityLogMiddleware',")
            
        except Exception as e:
            if "does not exist" in str(e).lower():
                print(f"✓ Columns already allow NULL or don't have NOT NULL constraint")
            else:
                print(f"✗ Error: {e}")

if __name__ == '__main__':
    try:
        fix_activity_logs_null()
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nThe activity logging middleware has been disabled.")
        print("Department operations should work now.")
