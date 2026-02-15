#!/usr/bin/env python
"""
Test script for alumni course endpoints
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.students.models import Student
from apps.alumni.models import Alumni
from rest_framework.test import APIClient
from django.conf import settings

User = get_user_model()

def test_course_endpoints():
    """Test course management endpoints"""
    print("\n" + "="*80)
    print("TESTING ALUMNI COURSE ENDPOINTS")
    print("="*80)
    
    # Add testserver to ALLOWED_HOSTS temporarily
    original_allowed_hosts = settings.ALLOWED_HOSTS
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
    
    try:
        # Find an alumni profile
        alumni = Alumni.objects.select_related('student').first()
        
        if not alumni:
            print("\n❌ No alumni profiles found")
            return
        
        student = alumni.student
        print(f"\n📋 Testing with alumni: {student.fullNameEnglish}")
        print(f"   Student ID: {student.id}")
        
        # Find or create user
        user = User.objects.filter(related_profile_id=student.id).first()
        
        if not user:
            print(f"\n⚠️  No user found for student {student.id}")
            return
        
        # Create API client and authenticate
        client = APIClient()
        client.force_authenticate(user=user)
        
        print("\n" + "-"*80)
        print("TEST 1: Add Course")
        print("-"*80)
        
        course_data = {
            'name': 'AWS Solutions Architect',
            'provider': 'Amazon Web Services',
            'status': 'completed',
            'completionDate': '2024-06-15',
            'certificateId': 'AWS-SAA-123456',
            'certificateUrl': 'https://aws.amazon.com/verify/cert',
            'description': 'Cloud architecture fundamentals',
        }
        
        response = client.post('/api/alumni/add_my_course/', course_data, format='json')
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Successfully added course")
            print(f"  Courses: {len(data.get('courses', []))} courses")
            if data.get('courses'):
                latest = data['courses'][-1]
                print(f"  Latest Course: {latest['name']} by {latest['provider']}")
                print(f"  Status: {latest['status']}")
                course_id = latest['id']
        else:
            print(f"❌ Failed to add course")
            print(f"Response: {response.json()}")
            return
        
        print("\n" + "-"*80)
        print("TEST 2: Update Course")
        print("-"*80)
        
        update_data = {
            'name': 'AWS Solutions Architect - Associate',
            'provider': 'Amazon Web Services',
            'status': 'completed',
            'completionDate': '2024-06-15',
            'certificateId': 'AWS-SAA-123456-UPDATED',
            'certificateUrl': 'https://aws.amazon.com/verify/cert-updated',
            'description': 'Updated description',
        }
        
        response = client.put(f'/api/alumni/update-my-course/{course_id}/', update_data, format='json')
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Successfully updated course")
            updated_course = next((c for c in data.get('courses', []) if c['id'] == course_id), None)
            if updated_course:
                print(f"  Updated Name: {updated_course['name']}")
                print(f"  Updated Certificate ID: {updated_course['certificateId']}")
        else:
            print(f"❌ Failed to update course")
            print(f"Response: {response.json()}")
        
        print("\n" + "-"*80)
        print("TEST 3: Get Profile with Courses")
        print("-"*80)
        
        response = client.get('/api/alumni/my_profile/')
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Successfully retrieved profile")
            print(f"  Total Courses: {len(data.get('courses', []))}")
            for course in data.get('courses', []):
                print(f"    - {course['name']} ({course['status']})")
        else:
            print(f"❌ Failed to retrieve profile")
        
        print("\n" + "-"*80)
        print("TEST 4: Delete Course")
        print("-"*80)
        
        response = client.delete(f'/api/alumni/delete-my-course/{course_id}/')
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Successfully deleted course")
            print(f"  Remaining Courses: {len(data.get('courses', []))}")
        else:
            print(f"❌ Failed to delete course")
            print(f"Response: {response.json()}")
        
        print("\n" + "="*80)
        print("COURSE TESTS COMPLETED")
        print("="*80 + "\n")
        
    finally:
        # Restore original ALLOWED_HOSTS
        settings.ALLOWED_HOSTS = original_allowed_hosts

if __name__ == '__main__':
    test_course_endpoints()
