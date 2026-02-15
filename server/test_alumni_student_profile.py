#!/usr/bin/env python
"""
Test script for alumni student profile endpoints
Tests the my-profile endpoint for students with alumni profiles
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
import json

User = get_user_model()

def test_alumni_profile():
    """Test alumni profile endpoints"""
    print("\n" + "="*80)
    print("TESTING ALUMNI STUDENT PROFILE ENDPOINTS")
    print("="*80)
    
    # Add testserver to ALLOWED_HOSTS temporarily
    from django.conf import settings
    original_allowed_hosts = settings.ALLOWED_HOSTS
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
    
    try:
        _run_tests()
    finally:
        # Restore original ALLOWED_HOSTS
        settings.ALLOWED_HOSTS = original_allowed_hosts

def _run_tests():
    """Run the actual tests"""
    print("\n" + "="*80)
    print("TESTING ALUMNI STUDENT PROFILE ENDPOINTS")
    print("="*80)
    print("\n" + "="*80)
    print("TESTING ALUMNI STUDENT PROFILE ENDPOINTS")
    print("="*80)
    
    # Find a student with alumni profile
    alumni = Alumni.objects.select_related('student').first()
    
    if not alumni:
        print("\n❌ No alumni profiles found in database")
        print("Creating a test alumni profile...")
        
        # Find a graduated student
        student = Student.objects.filter(studentStatus='graduated').first()
        
        if not student:
            print("❌ No graduated students found")
            return
        
        # Create alumni profile
        alumni = Alumni.objects.create(
            student=student,
            alumniType='recent',
            graduationYear=2024,
            currentSupportCategory='no_support_needed',
            bio='Test alumni profile',
        )
        print(f"✅ Created test alumni profile for {student.fullNameEnglish}")
    
    student = alumni.student
    print(f"\n📋 Testing with alumni: {student.fullNameEnglish}")
    print(f"   Student ID: {student.id}")
    print(f"   Alumni Type: {alumni.alumniType}")
    print(f"   Graduation Year: {alumni.graduationYear}")
    
    # Find or create user for this student
    user = User.objects.filter(related_profile_id=student.id).first()
    
    if not user:
        print(f"\n⚠️  No user found for student {student.id}")
        print("Creating test user...")
        
        # Create user
        user = User.objects.create_user(
            username=f'test_alumni_{student.id}@test.com',
            email=f'test_alumni_{student.id}@test.com',
            password='testpass123',
            role='student',
            related_profile_id=student.id,
            is_alumni=True,
        )
        print(f"✅ Created test user: {user.username}")
    
    # Create API client and authenticate
    client = APIClient()
    client.force_authenticate(user=user)
    
    print("\n" + "-"*80)
    print("TEST 1: Get My Alumni Profile")
    print("-"*80)
    
    response = client.get('/api/alumni/my_profile/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Successfully retrieved alumni profile")
        print(f"\nProfile Data:")
        print(f"  Name: {data['student']['fullNameEnglish']}")
        print(f"  Roll: {data['student']['currentRollNumber']}")
        print(f"  Department: {data['student']['department']['name']}")
        print(f"  Alumni Type: {data['alumniType']}")
        print(f"  Graduation Year: {data['graduationYear']}")
        print(f"  Support Category: {data['currentSupportCategory']}")
        print(f"  Bio: {data.get('bio', 'N/A')}")
        print(f"  LinkedIn: {data.get('linkedinUrl', 'N/A')}")
        print(f"  Portfolio: {data.get('portfolioUrl', 'N/A')}")
        print(f"  Career History: {len(data.get('careerHistory', []))} entries")
        print(f"  Skills: {len(data.get('skills', []))} skills")
        print(f"  Highlights: {len(data.get('highlights', []))} highlights")
    else:
        print(f"❌ Failed to retrieve profile")
        print(f"Response: {response.json()}")
    
    print("\n" + "-"*80)
    print("TEST 2: Update My Alumni Profile")
    print("-"*80)
    
    update_data = {
        'bio': 'Updated bio for testing',
        'linkedinUrl': 'https://linkedin.com/in/test-alumni',
        'portfolioUrl': 'https://portfolio.test.com',
        'email': 'updated@test.com',
        'phone': '01712345678',
        'location': 'Dhaka',
    }
    
    response = client.patch('/api/alumni/update_my_profile/', update_data, format='json')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Successfully updated alumni profile")
        print(f"\nUpdated Data:")
        print(f"  Bio: {data.get('bio')}")
        print(f"  LinkedIn: {data.get('linkedinUrl')}")
        print(f"  Portfolio: {data.get('portfolioUrl')}")
        print(f"  Email: {data['student'].get('email')}")
        print(f"  Phone: {data['student'].get('mobileStudent')}")
    else:
        print(f"❌ Failed to update profile")
        print(f"Response: {response.json()}")
    
    print("\n" + "-"*80)
    print("TEST 3: Add Career Position")
    print("-"*80)
    
    career_data = {
        'positionType': 'job',
        'organizationName': 'Test Company Ltd.',
        'positionTitle': 'Software Engineer',
        'startDate': '2024-01-01',
        'isCurrent': True,
        'description': 'Working on web applications',
        'location': 'Dhaka',
        'salary': '50000 BDT',
    }
    
    response = client.post('/api/alumni/add_my_career/', career_data, format='json')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Successfully added career position")
        print(f"  Career History: {len(data.get('careerHistory', []))} entries")
        if data.get('careerHistory'):
            latest = data['careerHistory'][-1]
            print(f"  Latest Position: {latest['positionTitle']} at {latest['organizationName']}")
    else:
        print(f"❌ Failed to add career position")
        print(f"Response: {response.json()}")
    
    print("\n" + "-"*80)
    print("TEST 4: Add Skill")
    print("-"*80)
    
    skill_data = {
        'name': 'Python',
        'category': 'technical',
        'proficiency': 85,
    }
    
    response = client.post('/api/alumni/add_my_skill/', skill_data, format='json')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Successfully added skill")
        print(f"  Skills: {len(data.get('skills', []))} skills")
        if data.get('skills'):
            latest = data['skills'][-1]
            print(f"  Latest Skill: {latest['name']} ({latest['category']}) - {latest['proficiency']}%")
    else:
        print(f"❌ Failed to add skill")
        print(f"Response: {response.json()}")
    
    print("\n" + "-"*80)
    print("TEST 5: Add Highlight")
    print("-"*80)
    
    highlight_data = {
        'title': 'Best Graduate Award',
        'description': 'Received best graduate award from department',
        'date': '2024-03-15',
        'type': 'award',
    }
    
    response = client.post('/api/alumni/add_my_highlight/', highlight_data, format='json')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Successfully added highlight")
        print(f"  Highlights: {len(data.get('highlights', []))} highlights")
        if data.get('highlights'):
            latest = data['highlights'][-1]
            print(f"  Latest Highlight: {latest['title']} ({latest['type']})")
    else:
        print(f"❌ Failed to add highlight")
        print(f"Response: {response.json()}")
    
    
    print("\n" + "="*80)
    print("ALUMNI PROFILE TESTS COMPLETED")
    print("="*80 + "\n")

if __name__ == '__main__':
    test_alumni_profile()
