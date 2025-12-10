#!/usr/bin/env python
"""
Script to create activity_logs table if it doesn't exist
Run this with: python fix_activity_logs.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.db import connection

def create_activity_logs_table():
    """Create activity_logs table if it doesn't exist"""
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'activity_logs'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("✓ activity_logs table already exists")
            return
        
        print("Creating activity_logs table...")
        
        # Create the table
        cursor.execute("""
            CREATE TABLE activity_logs (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                model_name VARCHAR(100),
                object_id VARCHAR(255),
                description TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                FOREIGN KEY (user_id) REFERENCES authentication_customuser(id) ON DELETE CASCADE
            );
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
        """)
        cursor.execute("""
            CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
        """)
        cursor.execute("""
            CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
        """)
        
        print("✓ activity_logs table created successfully")
        print("✓ Indexes created successfully")

if __name__ == '__main__':
    try:
        create_activity_logs_table()
        print("\n✓ Activity logs table setup complete!")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nAlternatively, you can run Django migrations:")
        print("  python manage.py makemigrations activity_logs")
        print("  python manage.py migrate activity_logs")
