#!/usr/bin/env python
"""
Script to check and fix activity_logs table structure
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.db import connection

def check_and_fix_table():
    """Check and fix activity_logs table structure"""
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'activity_logs'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("✗ activity_logs table does not exist")
            print("Creating table...")
            
            cursor.execute("""
                CREATE TABLE activity_logs (
                    id UUID PRIMARY KEY,
                    user_id UUID,
                    action_type VARCHAR(50) NOT NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    changes JSONB DEFAULT '{}',
                    ip_address INET,
                    user_agent TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    FOREIGN KEY (user_id) REFERENCES authentication_customuser(id) ON DELETE SET NULL
                );
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp);")
            cursor.execute("CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);")
            cursor.execute("CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);")
            cursor.execute("CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);")
            
            print("✓ Table created successfully")
            return
        
        print("✓ activity_logs table exists")
        
        # Check table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'activity_logs'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("\nCurrent table structure:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
        
        # Check if we need to add missing columns
        column_names = [col[0] for col in columns]
        
        required_columns = {
            'id': 'UUID',
            'user_id': 'UUID',
            'action_type': 'VARCHAR(50)',
            'entity_type': 'VARCHAR(50)',
            'entity_id': 'VARCHAR(255)',
            'description': 'TEXT',
            'changes': 'JSONB',
            'ip_address': 'INET',
            'user_agent': 'TEXT',
            'timestamp': 'TIMESTAMP WITH TIME ZONE'
        }
        
        print("\nChecking for missing columns...")
        for col_name, col_type in required_columns.items():
            if col_name not in column_names:
                print(f"  Adding missing column: {col_name}")
                if col_name == 'changes':
                    cursor.execute(f"ALTER TABLE activity_logs ADD COLUMN {col_name} JSONB DEFAULT '{{}}'::jsonb;")
                elif col_name == 'timestamp':
                    cursor.execute(f"ALTER TABLE activity_logs ADD COLUMN {col_name} TIMESTAMP WITH TIME ZONE DEFAULT NOW();")
                elif col_name in ['user_id', 'ip_address', 'user_agent']:
                    cursor.execute(f"ALTER TABLE activity_logs ADD COLUMN {col_name} {col_type};")
                else:
                    cursor.execute(f"ALTER TABLE activity_logs ADD COLUMN {col_name} {col_type} NOT NULL DEFAULT '';")
        
        # Make user_id nullable if it isn't
        if 'user_id' in column_names:
            cursor.execute("""
                SELECT is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'activity_logs' AND column_name = 'user_id';
            """)
            is_nullable = cursor.fetchone()[0]
            if is_nullable == 'NO':
                print("  Making user_id nullable...")
                cursor.execute("ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL;")
        
        # Make user_agent nullable if it isn't
        if 'user_agent' in column_names:
            cursor.execute("""
                SELECT is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'activity_logs' AND column_name = 'user_agent';
            """)
            is_nullable = cursor.fetchone()[0]
            if is_nullable == 'NO':
                print("  Making user_agent nullable...")
                cursor.execute("ALTER TABLE activity_logs ALTER COLUMN user_agent DROP NOT NULL;")
        
        print("\n✓ Table structure verified and fixed!")

if __name__ == '__main__':
    try:
        check_and_fix_table()
        print("\n✓ Activity logs table is ready!")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
