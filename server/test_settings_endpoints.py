#!/usr/bin/env python
"""
Test script for settings endpoints (password change and profile update)
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
import json

User = get_user_model()

def test_settings_endpoints():
    """Test password change and profile update endpoints"""
    print("🧪 Testing Settings Endpoints")
    print("=" * 60)
    
    # Create a test user
    print("\n1️⃣ Creating test user...")
    test_email = "test_settings@example.com"
    test_password = "TestPassword123"
    
    # Delete existing test user if exists
    User.objects.filter(email=test_email).delete()
    
    user = User.objects.create_user(
        username=test_email,
        email=test_email,
        password=test_password,
        first_name="Test",
        last_name="User",
        role="student"
    )
    print(f"✓ Created user: {user.email}")
    
    # Create a test client
    client = Client()
    
    # Login
    print("\n2️⃣ Logging in...")
    response = client.post('/api/auth/login/', {
        'username': test_email,
        'password': test_password
    }, content_type='application/json')
    
    if response.status_code == 200:
        print("✓ Login successful")
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(response.content.decode())
        return
    
    # Test password change with wrong old password
    print("\n3️⃣ Testing password change with wrong old password...")
    response = client.post('/api/auth/change-password/', {
        'old_password': 'WrongPassword123',
        'new_password': 'NewPassword123',
        'confirm_password': 'NewPassword123'
    }, content_type='application/json')
    
    if response.status_code == 400:
        data = json.loads(response.content)
        if 'old_password' in data:
            print("✓ Correctly rejected wrong old password")
        else:
            print(f"✗ Unexpected error: {data}")
    else:
        print(f"✗ Expected 400, got {response.status_code}")
    
    # Test password change with correct old password
    print("\n4️⃣ Testing password change with correct old password...")
    response = client.post('/api/auth/change-password/', {
        'old_password': test_password,
        'new_password': 'NewPassword123',
        'confirm_password': 'NewPassword123'
    }, content_type='application/json')
    
    if response.status_code == 200:
        data = json.loads(response.content)
        print(f"✓ Password changed successfully: {data.get('message')}")
        test_password = 'NewPassword123'  # Update for next tests
    else:
        print(f"✗ Password change failed: {response.status_code}")
        print(response.content.decode())
    
    # Test password change with mismatched passwords
    print("\n5️⃣ Testing password change with mismatched passwords...")
    response = client.post('/api/auth/change-password/', {
        'old_password': test_password,
        'new_password': 'NewPassword456',
        'confirm_password': 'NewPassword789'
    }, content_type='application/json')
    
    if response.status_code == 400:
        print("✓ Correctly rejected mismatched passwords")
    else:
        print(f"✗ Expected 400, got {response.status_code}")
    
    # Test profile update
    print("\n6️⃣ Testing profile update...")
    response = client.put('/api/auth/profile/', {
        'first_name': 'Updated',
        'last_name': 'Name',
        'email': 'updated_email@example.com'
    }, content_type='application/json')
    
    if response.status_code == 200:
        data = json.loads(response.content)
        print(f"✓ Profile updated successfully")
        print(f"  - Name: {data['user']['first_name']} {data['user']['last_name']}")
        print(f"  - Email: {data['user']['email']}")
    else:
        print(f"✗ Profile update failed: {response.status_code}")
        print(response.content.decode())
    
    # Test profile update with duplicate email
    print("\n7️⃣ Testing profile update with duplicate email...")
    # Create another user
    User.objects.create_user(
        username="another@example.com",
        email="another@example.com",
        password="Password123",
        role="student"
    )
    
    response = client.put('/api/auth/profile/', {
        'email': 'another@example.com'
    }, content_type='application/json')
    
    if response.status_code == 400:
        data = json.loads(response.content)
        if 'email' in data:
            print("✓ Correctly rejected duplicate email")
        else:
            print(f"✗ Unexpected error: {data}")
    else:
        print(f"✗ Expected 400, got {response.status_code}")
    
    # Cleanup
    print("\n8️⃣ Cleaning up...")
    User.objects.filter(email__in=[test_email, 'updated_email@example.com', 'another@example.com']).delete()
    print("✓ Test users deleted")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")

if __name__ == '__main__':
    test_settings_endpoints()
