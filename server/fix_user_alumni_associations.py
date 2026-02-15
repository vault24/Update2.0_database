#!/usr/bin/env python
"""
Fix user related_profile_id associations and create alumni profiles
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.students.models import Student
from apps.alumni.models import Alumni

User = get_user_model()

def fix_user_associations():
    """Fix user profile associations"""
    print("\n" + "="*80)
    print("FIXING USER PROFILE ASSOCIATIONS")
    print("="*80 + "\n")
    
    # Find users without proper related_profile_id
    users_to_check = User.objects.filter(role__in=['student', 'captain', 'alumni'])
    
    fixed_count = 0
    alumni_created = 0
    
    for user in users_to_check:
        print(f"Checking user: {user.username} (ID: {user.id}, Role: {user.role})")
        
        if not user.related_profile_id:
            print(f"  ⚠️  No related_profile_id set")
            
            # Try to find student by email
            student = Student.objects.filter(email=user.email).first()
            
            if student:
                user.related_profile_id = student.id
                user.save()
                print(f"  ✅ Fixed related_profile_id: {student.id}")
                print(f"     Student: {student.fullNameEnglish}")
                print(f"     Status: {student.status}")
                fixed_count += 1
                
                # Check if alumni profile exists for graduated students
                if student.status == 'graduated':
                    alumni, created = Alumni.objects.get_or_create(
                        student=student,
                        defaults={
                            'alumniType': 'recent',
                            'graduationYear': 2024,
                            'currentSupportCategory': 'no_support_needed'
                        }
                    )
                    if created:
                        print(f"  ✅ Created alumni profile")
                        alumni_created += 1
                    else:
                        print(f"  ℹ️  Alumni profile already exists")
            else:
                print(f"  ❌ No student found with email: {user.email}")
        else:
            print(f"  ✅ Already has related_profile_id: {user.related_profile_id}")
            
            # Verify the student exists
            try:
                student = Student.objects.get(id=user.related_profile_id)
                print(f"     Student: {student.fullNameEnglish}")
                print(f"     Status: {student.status}")
                
                # Check if graduated student needs alumni profile
                if student.status == 'graduated':
                    alumni, created = Alumni.objects.get_or_create(
                        student=student,
                        defaults={
                            'alumniType': 'recent',
                            'graduationYear': 2024,
                            'currentSupportCategory': 'no_support_needed'
                        }
                    )
                    if created:
                        print(f"  ✅ Created alumni profile")
                        alumni_created += 1
            except Student.DoesNotExist:
                print(f"  ❌ Student with ID {user.related_profile_id} not found!")
        
        print()
    
    print("="*80)
    print(f"SUMMARY")
    print("="*80)
    print(f"Users checked: {users_to_check.count()}")
    print(f"Associations fixed: {fixed_count}")
    print(f"Alumni profiles created: {alumni_created}")
    print("="*80 + "\n")

if __name__ == '__main__':
    fix_user_associations()
