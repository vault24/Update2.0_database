#!/usr/bin/env python
"""
Test script to verify teacher registration creates both User and TeacherSignupRequest
"""
import os
import sys
import django

# Add the server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.authentication.models import User
from apps.teacher_requests.models import TeacherSignupRequest
from apps.departments.models import Department
from apps.authentication.serializers import RegisterSerializer

def test_teacher_registration():
    """Test that teacher registration creates both User and TeacherSignupRequest"""
    
    # Get a department for testing
    try:
        department = Department.objects.first()
        if not department:
            print("❌ No departments found. Please create a department first.")
            return False
    except Exception as e:
        print(f"❌ Error getting department: {e}")
        return False
    
    # Test data
    test_data = {
        'username': 'test_teacher@example.com',
        'email': 'test_teacher@example.com',
        'password': 'TestPassword123!',
        'password_confirm': 'TestPassword123!',
        'first_name': 'Test',
        'last_name': 'Teacher',
        'role': 'teacher',
        'mobile_number': '01234567890',
        'full_name_english': 'Test Teacher',
        'full_name_bangla': 'টেস্ট শিক্ষক',
        'designation': 'Assistant Professor',
        'department': str(department.id),
        'qualifications': ['PhD in Computer Science'],
        'specializations': ['Machine Learning', 'Data Science'],
        'office_location': 'Room 101'
    }
    
    # Clean up any existing test data
    User.objects.filter(username=test_data['username']).delete()
    TeacherSignupRequest.objects.filter(email=test_data['email']).delete()
    
    try:
        # Test registration
        serializer = RegisterSerializer(data=test_data)
        if not serializer.is_valid():
            print(f"❌ Serializer validation failed: {serializer.errors}")
            return False
        
        user = serializer.save()
        print(f"✅ User created: {user.username} with role {user.role}")
        print(f"✅ User account status: {user.account_status}")
        
        # Check if TeacherSignupRequest was created
        try:
            teacher_request = TeacherSignupRequest.objects.get(user=user)
            print(f"✅ TeacherSignupRequest created: {teacher_request.full_name_english}")
            print(f"✅ Request status: {teacher_request.status}")
            print(f"✅ Department: {teacher_request.department.name}")
            
            # Verify data integrity
            assert user.role == 'teacher'
            assert user.account_status == 'pending'
            assert teacher_request.status == 'pending'
            assert teacher_request.email == user.email
            assert teacher_request.mobile_number == user.mobile_number
            
            print("✅ All assertions passed!")
            return True
            
        except TeacherSignupRequest.DoesNotExist:
            print("❌ TeacherSignupRequest was not created")
            return False
            
    except Exception as e:
        print(f"❌ Error during registration: {e}")
        return False
    
    finally:
        # Clean up test data
        User.objects.filter(username=test_data['username']).delete()
        TeacherSignupRequest.objects.filter(email=test_data['email']).delete()

def test_teacher_login_prevention():
    """Test that pending teachers cannot login"""
    
    # Get a department for testing
    department = Department.objects.first()
    if not department:
        print("❌ No departments found for login test.")
        return False
    
    # Create a pending teacher
    test_data = {
        'username': 'pending_teacher@example.com',
        'email': 'pending_teacher@example.com',
        'password': 'TestPassword123!',
        'password_confirm': 'TestPassword123!',
        'first_name': 'Pending',
        'last_name': 'Teacher',
        'role': 'teacher',
        'mobile_number': '01234567891',
        'full_name_english': 'Pending Teacher',
        'full_name_bangla': 'পেন্ডিং শিক্ষক',
        'designation': 'Lecturer',
        'department': str(department.id),
    }
    
    # Clean up any existing test data
    User.objects.filter(username=test_data['username']).delete()
    TeacherSignupRequest.objects.filter(email=test_data['email']).delete()
    
    try:
        # Create user
        serializer = RegisterSerializer(data=test_data)
        if not serializer.is_valid():
            print(f"❌ Login test setup failed: {serializer.errors}")
            return False
        
        user = serializer.save()
        
        # Test login prevention
        if user.can_login():
            print("❌ Pending teacher should not be able to login")
            return False
        else:
            print("✅ Pending teacher login correctly prevented")
            
        # Test error message
        error_msg = user.get_login_error_message()
        if 'pending approval' in error_msg.lower():
            print(f"✅ Correct error message: {error_msg}")
            return True
        else:
            print(f"❌ Incorrect error message: {error_msg}")
            return False
            
    except Exception as e:
        print(f"❌ Error during login test: {e}")
        return False
    
    finally:
        # Clean up test data
        User.objects.filter(username=test_data['username']).delete()
        TeacherSignupRequest.objects.filter(email=test_data['email']).delete()

if __name__ == '__main__':
    print("🧪 Testing Teacher Registration Integration...")
    print("=" * 50)
    
    print("\n1. Testing teacher registration creates both User and TeacherSignupRequest...")
    registration_success = test_teacher_registration()
    
    print("\n2. Testing pending teacher login prevention...")
    login_prevention_success = test_teacher_login_prevention()
    
    print("\n" + "=" * 50)
    if registration_success and login_prevention_success:
        print("🎉 All tests passed! Teacher signup approval fix is working correctly.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please check the implementation.")
        sys.exit(1)