#!/usr/bin/env python
"""
PostgreSQL Connection Verification Script for SLMS
This script verifies that PostgreSQL is properly configured and connected
"""

import os
import sys
import django
from pathlib import Path

# Add the server directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.db import connection
from django.core.management import call_command
from django.apps import apps

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def verify_database_connection():
    """Verify database connection"""
    print_header("1. Database Connection")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Connected to PostgreSQL")
            print(f"   Version: {version[0]}")
            return True
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL")
        print(f"   Error: {str(e)}")
        return False

def verify_database_settings():
    """Verify database settings"""
    print_header("2. Database Settings")
    
    from django.conf import settings
    db_config = settings.DATABASES['default']
    
    print(f"Engine:   {db_config['ENGINE']}")
    print(f"Database: {db_config['NAME']}")
    print(f"User:     {db_config['USER']}")
    print(f"Host:     {db_config['HOST']}")
    print(f"Port:     {db_config['PORT']}")
    
    return True

def verify_migrations():
    """Verify migrations status"""
    print_header("3. Migration Status")
    
    try:
        from django.core.management import execute_from_command_line
        from io import StringIO
        
        # Get migration status
        from django.db.migrations.executor import MigrationExecutor
        executor = MigrationExecutor(connection)
        
        # Get all migrations
        all_migrations = executor.loader.disk_migrations
        applied_migrations = executor.loader.applied_migrations
        
        print(f"Total migrations: {len(all_migrations)}")
        print(f"Applied migrations: {len(applied_migrations)}")
        
        # Check for unapplied migrations
        unapplied = set(all_migrations) - applied_migrations
        if unapplied:
            print(f"\n⚠️  Unapplied migrations: {len(unapplied)}")
            for migration in list(unapplied)[:5]:
                print(f"   - {migration}")
            if len(unapplied) > 5:
                print(f"   ... and {len(unapplied) - 5} more")
            print("\n   Run: python manage.py migrate")
        else:
            print("✅ All migrations applied")
        
        return True
    except Exception as e:
        print(f"⚠️  Could not check migrations: {str(e)}")
        return False

def verify_installed_apps():
    """Verify installed apps"""
    print_header("4. Installed Apps")
    
    from django.conf import settings
    
    print("Django Apps:")
    for app in settings.INSTALLED_APPS:
        if app.startswith('django.'):
            print(f"  ✅ {app}")
    
    print("\nThird-party Apps:")
    for app in settings.INSTALLED_APPS:
        if not app.startswith('django.') and not app.startswith('apps.'):
            print(f"  ✅ {app}")
    
    print("\nLocal Apps:")
    for app in settings.INSTALLED_APPS:
        if app.startswith('apps.'):
            print(f"  ✅ {app}")
    
    return True

def verify_tables():
    """Verify database tables"""
    print_header("5. Database Tables")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            
            if tables:
                print(f"Found {len(tables)} tables:")
                for table in tables:
                    print(f"  ✅ {table[0]}")
            else:
                print("⚠️  No tables found. Run: python manage.py migrate")
            
            return len(tables) > 0
    except Exception as e:
        print(f"❌ Error checking tables: {str(e)}")
        return False

def verify_api_endpoints():
    """Verify API endpoints"""
    print_header("6. API Endpoints")
    
    from django.urls import get_resolver
    from django.urls.exceptions import Resolver404
    
    try:
        resolver = get_resolver()
        
        # Check for common API endpoints
        endpoints = [
            '/api/dashboard/stats/',
            '/api/students/',
            '/api/departments/',
            '/api/alumni/',
            '/api/documents/',
            '/api/applications/',
        ]
        
        print("Checking API endpoints:")
        for endpoint in endpoints:
            try:
                resolver.resolve(endpoint)
                print(f"  ✅ {endpoint}")
            except Resolver404:
                print(f"  ❌ {endpoint} - Not found")
        
        return True
    except Exception as e:
        print(f"⚠️  Could not verify endpoints: {str(e)}")
        return False

def verify_cors_settings():
    """Verify CORS settings"""
    print_header("7. CORS Configuration")
    
    from django.conf import settings
    
    print("CORS Allowed Origins:")
    for origin in settings.CORS_ALLOWED_ORIGINS:
        print(f"  ✅ {origin}")
    
    print(f"\nCORS Allow Credentials: {settings.CORS_ALLOW_CREDENTIALS}")
    
    return True

def main():
    """Run all verification checks"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 58 + "║")
    print("║" + "  SLMS PostgreSQL Connection Verification".center(58) + "║")
    print("║" + " " * 58 + "║")
    print("╚" + "=" * 58 + "╝")
    
    results = {
        "Database Connection": verify_database_connection(),
        "Database Settings": verify_database_settings(),
        "Migration Status": verify_migrations(),
        "Installed Apps": verify_installed_apps(),
        "Database Tables": verify_tables(),
        "API Endpoints": verify_api_endpoints(),
        "CORS Configuration": verify_cors_settings(),
    }
    
    # Summary
    print_header("Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\nTests Passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ All checks passed! Your PostgreSQL connection is properly configured.")
        print("\nYou can now:")
        print("  1. Start the Django server: python manage.py runserver")
        print("  2. Access the API at: http://localhost:8000/api/")
        print("  3. Access the admin panel at: http://localhost:8000/admin/")
        return 0
    else:
        print("\n⚠️  Some checks failed. Please review the errors above.")
        print("\nCommon solutions:")
        print("  1. Ensure PostgreSQL is running")
        print("  2. Run migrations: python manage.py migrate")
        print("  3. Check .env file configuration")
        print("  4. Verify database credentials")
        return 1

if __name__ == '__main__':
    sys.exit(main())
