"""
Script to set password for teacher account vault7950@gmail.com
Usage: python set_teacher_password.py <new_password>
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def set_teacher_password(new_password):
    """Set password for teacher account"""
    email = 'vault7950@gmail.com'
    
    try:
        # Find all users with this email
        users = User.objects.filter(email=email)
        
        if not users.exists():
            print(f"❌ User with email {email} not found!")
            print()
            print("Available teacher accounts:")
            teachers = User.objects.filter(role='teacher')
            for teacher in teachers:
                print(f"  - {teacher.username} ({teacher.email})")
            return False
        
        print(f"Found {users.count()} user(s) with email {email}:")
        print()
        
        # Update password for all users with this email
        for user in users:
            print(f"Updating password for:")
            print(f"  Username: {user.username}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  Account Status: {user.account_status}")
            print(f"  ID: {user.id}")
            
            user.set_password(new_password)
            user.save()
            
            print(f"  ✅ Password updated!")
            print()
        
        print("✅ All passwords changed successfully!")
        print()
        print("The teacher can now login with the new password.")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python set_teacher_password.py <new_password>")
        print()
        print("Example: python set_teacher_password.py MyNewPassword123")
        sys.exit(1)
    
    new_password = sys.argv[1]
    
    if len(new_password) < 8:
        print("❌ Password must be at least 8 characters long!")
        sys.exit(1)
    
    success = set_teacher_password(new_password)
    sys.exit(0 if success else 1)
