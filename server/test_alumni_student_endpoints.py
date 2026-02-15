"""
Test script for student-side alumni endpoints
Tests the new endpoints that allow students to manage their own alumni profiles
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
from rest_framework import status
import json

User = get_user_model()

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_response(response):
    """Print formatted response"""
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.content}")

def test_alumni_student_endpoints():
    """Test all student-side alumni endpoints"""
    
    print_section("Alumni Student Endpoints Test")
    
    # Create API client
    client = APIClient()
    
    # Find or create a test student with alumni profile
    print("Setting up test data...")
    
    # Find an alumni student
    alumni = Alumni.objects.select_related('student', 'student__user').first()
    
    if not alumni:
        print("❌ No alumni found in database. Please create an alumni record first.")
        return
    
    student = alumni.student
    user = student.user
    
    if not user:
        print("❌ Alumni student has no associated user account.")
        return
    
    print(f"✓ Using alumni: {student.fullNameEnglish} (ID: {student.id})")
    print(f"✓ User: {user.username}")
    
    # Authenticate as the student
    client.force_authenticate(user=user)
    
    # Test 1: Get my profile
    print_section("Test 1: Get My Alumni Profile")
    response = client.get('/api/alumni/my-profile/')
    print_response(response)
    
    if response.status_code == 200:
        print("✓ Successfully retrieved alumni profile")
        profile_data = response.json()
    else:
        print("❌ Failed to retrieve alumni profile")
        return
    
    # Test 2: Update my profile
    print_section("Test 2: Update My Profile")
    update_data = {
        'bio': 'Updated bio from test script',
        'linkedinUrl': 'https://linkedin.com/in/test-alumni',
        'portfolioUrl': 'https://test-portfolio.com',
        'email': 'updated.email@example.com',
        'phone': '+880 1712-345678',
        'location': 'Dhaka'
    }
    response = client.patch('/api/alumni/update-my-profile/', update_data, format='json')
    print_response(response)
    
    if response.status_code == 200:
        print("✓ Successfully updated profile")
    else:
        print("❌ Failed to update profile")
    
    # Test 3: Add career position
    print_section("Test 3: Add Career Position")
    career_data = {
        'positionType': 'job',
        'organizationName': 'Test Company Ltd.',
        'positionTitle': 'Software Engineer',
        'startDate': '2024-01-01',
        'isCurrent': True,
        'description': 'Working on web applications',
        'location': 'Dhaka',
        'salary': '50,000 BDT'
    }
    response = client.post('/api/alumni/add-my-career/', career_data, format='json')
    print_response(response)
    
    if response.status_code == 200:
        print("✓ Successfully added career position")
        career_id = response.json()['careerHistory'][-1]['id']
    else:
        print("❌ Failed to add career position")
        career_id = None
    
    # Test 4: Update career position
    if career_id:
        print_section("Test 4: Update Career Position")
        update_career_data = {
            'positionType': 'job',
            'organizationName': 'Test Company Ltd.',
            'positionTitle': 'Senior Software Engineer',
            'startDate': '2024-01-01',
            'isCurrent': True,
            'description': 'Leading development team',
            'location': 'Dhaka',
            'salary': '70,000 BDT'
        }
        response = client.put(f'/api/alumni/update-my-career/{career_id}/', update_career_data, format='json')
        print_response(response)
        
        if response.status_code == 200:
            print("✓ Successfully updated career position")
        else:
            print("❌ Failed to update career position")
    
    # Test 5: Add skill
    print_section("Test 5: Add Skill")
    skill_data = {
        'name': 'Python',
        'category': 'technical',
        'proficiency': 85
    }
    response = client.post('/api/alumni/add-my-skill/', skill_data, format='json')
    print_response(response)
    
    if response.status_code == 200:
        print("✓ Successfully added skill")
        skill_id = response.json()['skills'][-1]['id']
    else:
        print("❌ Failed to add skill")
        skill_id = None
    
    # Test 6: Update skill
    if skill_id:
        print_section("Test 6: Update Skill")
        update_skill_data = {
            'name': 'Python',
            'category': 'technical',
            'proficiency': 90
        }
        response = client.put(f'/api/alumni/update-my-skill/{skill_id}/', update_skill_data, format='json')
        print_response(response)
        
        if response.status_code == 200:
            print("✓ Successfully updated skill")
        else:
            print("❌ Failed to update skill")
    
    # Test 7: Add highlight
    print_section("Test 7: Add Career Highlight")
    highlight_data = {
        'title': 'Test Achievement',
        'description': 'Successfully completed a major project',
        'date': '2024-06-01',
        'type': 'achievement'
    }
    response = client.post('/api/alumni/add-my-highlight/', highlight_data, format='json')
    print_response(response)
    
    if response.status_code == 200:
        print("✓ Successfully added highlight")
        highlight_id = response.json()['highlights'][-1]['id']
    else:
        print("❌ Failed to add highlight")
        highlight_id = None
    
    # Test 8: Update highlight
    if highlight_id:
        print_section("Test 8: Update Career Highlight")
        update_highlight_data = {
            'title': 'Test Achievement - Updated',
            'description': 'Successfully completed a major project with excellence',
            'date': '2024-06-01',
            'type': 'achievement'
        }
        response = client.put(f'/api/alumni/update-my-highlight/{highlight_id}/', update_highlight_data, format='json')
        print_response(response)
        
        if response.status_code == 200:
            print("✓ Successfully updated highlight")
        else:
            print("❌ Failed to update highlight")
    
    # Test 9: Delete highlight
    if highlight_id:
        print_section("Test 9: Delete Career Highlight")
        response = client.delete(f'/api/alumni/delete-my-highlight/{highlight_id}/')
        print_response(response)
        
        if response.status_code == 200:
            print("✓ Successfully deleted highlight")
        else:
            print("❌ Failed to delete highlight")
    
    # Test 10: Delete skill
    if skill_id:
        print_section("Test 10: Delete Skill")
        response = client.delete(f'/api/alumni/delete-my-skill/{skill_id}/')
        print_response(response)
        
        if response.status_code == 200:
            print("✓ Successfully deleted skill")
        else:
            print("❌ Failed to delete skill")
    
    # Test 11: Delete career position
    if career_id:
        print_section("Test 11: Delete Career Position")
        response = client.delete(f'/api/alumni/delete-my-career/{career_id}/')
        print_response(response)
        
        if response.status_code == 200:
            print("✓ Successfully deleted career position")
        else:
            print("❌ Failed to delete career position")
    
    print_section("Test Complete")
    print("All student-side alumni endpoints have been tested!")

if __name__ == '__main__':
    test_alumni_student_endpoints()
