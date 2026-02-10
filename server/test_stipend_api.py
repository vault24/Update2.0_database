"""
Quick test script for stipend API endpoints
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.stipends.models import StipendCriteria, StipendEligibility
from apps.students.models import Student
from apps.authentication.models import User

def test_stipend_api():
    print("=" * 60)
    print("Testing Stipend API")
    print("=" * 60)
    
    # Test 1: Check criteria
    print("\n1. Checking Stipend Criteria...")
    criteria = StipendCriteria.objects.all()
    print(f"   Found {criteria.count()} criteria")
    for c in criteria:
        print(f"   - {c.name}: Attendance≥{c.minAttendance}%, GPA≥{c.minGpa}, {c.passRequirement}")
    
    # Test 2: Check active students
    print("\n2. Checking Active Students...")
    students = Student.objects.filter(status='active')
    print(f"   Found {students.count()} active students")
    
    # Test 3: Check students with results
    print("\n3. Checking Students with Results...")
    students_with_results = Student.objects.filter(
        status='active',
        semesterResults__isnull=False
    ).exclude(semesterResults=[])
    print(f"   Found {students_with_results.count()} students with results")
    
    # Test 4: Sample student data
    if students_with_results.exists():
        print("\n4. Sample Student Data:")
        sample = students_with_results.first()
        print(f"   Name: {sample.fullNameEnglish}")
        print(f"   Roll: {sample.currentRollNumber}")
        print(f"   Semester: {sample.semester}")
        print(f"   Department: {sample.department.name if sample.department else 'N/A'}")
        print(f"   Results: {len(sample.semesterResults)} semesters")
        print(f"   Attendance: {len(sample.semesterAttendance)} semesters")
    
    # Test 5: Check eligibility records
    print("\n5. Checking Eligibility Records...")
    eligibility = StipendEligibility.objects.all()
    print(f"   Found {eligibility.count()} eligibility records")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)
    
    # Recommendations
    print("\nRecommendations:")
    if criteria.count() == 0:
        print("  ⚠ Run: python manage.py create_sample_criteria")
    if students.count() == 0:
        print("  ⚠ Add some active students to the database")
    if students_with_results.count() == 0:
        print("  ⚠ Add semester results to student records")
    if criteria.count() > 0 and students.count() > 0:
        print("  ✓ Ready to test eligibility calculation!")
        print("  ✓ Navigate to /stipend-eligible in admin panel")

if __name__ == '__main__':
    test_stipend_api()
