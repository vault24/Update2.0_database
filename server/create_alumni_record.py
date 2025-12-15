#!/usr/bin/env python3
"""
Create alumni record for graduated student
"""
import os
import sys
import django

# Add the server directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.students.models import Student
from apps.alumni.models import Alumni
from django.utils import timezone

def create_alumni_record():
    print("=== Creating Alumni Record ===\n")
    
    # Find the graduated student without alumni record
    graduated_students = Student.objects.filter(status='graduated')
    
    for student in graduated_students:
        try:
            # Check if already has alumni record
            alumni = student.alumni
            print(f"Student {student.fullNameEnglish} already has alumni record")
        except Alumni.DoesNotExist:
            print(f"Creating alumni record for: {student.fullNameEnglish}")
            
            # Create alumni record
            alumni = Alumni.objects.create(
                student=student,
                alumniType='recent',
                graduationYear=2024,
                currentSupportCategory='no_support_needed',
                transitionDate=timezone.now()
            )
            
            # Add initial support history
            alumni.supportHistory = [{
                'date': timezone.now().isoformat(),
                'previousCategory': None,
                'newCategory': 'no_support_needed',
                'notes': 'Initial transition to alumni - created manually for testing'
            }]
            alumni.save()
            
            print(f"✓ Successfully created alumni record for {student.fullNameEnglish}")
            print(f"  - Alumni Type: {alumni.alumniType}")
            print(f"  - Graduation Year: {alumni.graduationYear}")
            print(f"  - Support Category: {alumni.currentSupportCategory}")
    
    # Final check
    print(f"\nFinal alumni count: {Alumni.objects.count()}")

if __name__ == "__main__":
    create_alumni_record()