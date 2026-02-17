"""
Test department name in storage structure
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.admissions.models import Admission
from apps.departments.models import Department
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image

User = get_user_model()

def create_test_image():
    """Create a test image file"""
    img = Image.new('RGB', (300, 300), color='blue')
    img_io = BytesIO()
    img.save(img_io, 'JPEG')
    img_io.seek(0)
    return SimpleUploadedFile('test_photo2.jpg', img_io.read(), content_type='image/jpeg')

def test_department_name():
    print("=" * 70)
    print("Testing Department Name in Storage Structure")
    print("=" * 70)
    
    # Get department
    dept = Department.objects.first()
    print(f"\nDepartment:")
    print(f"  Code: {dept.code}")
    print(f"  Name: {dept.name}")
    
    # Get or create user
    user, _ = User.objects.get_or_create(
        username='test_dept_user',
        defaults={'email': 'testdept@example.com'}
    )
    
    # Create admission
    admission, created = Admission.objects.get_or_create(
        user=user,
        defaults={
            'full_name_english': 'Test Department User',
            'full_name_bangla': 'টেস্ট',
            'father_name': 'Father',
            'father_nid': '1234567890',
            'mother_name': 'Mother',
            'mother_nid': '0987654321',
            'date_of_birth': '2000-01-01',
            'birth_certificate_no': 'BC123',
            'gender': 'Male',
            'religion': 'Islam',
            'blood_group': 'A+',
            'mobile_student': '01712345678',
            'guardian_mobile': '01798765432',
            'email': 'testdept@example.com',
            'desired_department': dept,
            'desired_shift': '1st-shift',
            'session': '2024-2025',
            'board': 'Dhaka',
            'group': 'Science',
            'passing_year': '2023',
            'gpa': '5.00',
            'status': 'pending'
        }
    )
    
    print(f"\nAdmission:")
    print(f"  ID: {admission.id}")
    print(f"  Name: {admission.full_name_english}")
    print(f"  Department: {admission.desired_department.name}")
    
    # Test document upload
    test_photo = create_test_image()
    document_files = {'photo': test_photo}
    
    print("\n" + "-" * 70)
    print("Uploading document...")
    print("-" * 70)
    
    success = admission.process_documents(document_files)
    
    if success:
        print("✅ Document uploaded successfully!")
        
        # Check the document
        from apps.documents.models import Document
        doc = Document.objects.filter(
            source_type='admission',
            source_id=admission.id
        ).order_by('-uploadDate').first()
        
        if doc:
            print(f"\nDocument Path: {doc.filePath}")
            
            # Check if path contains department name
            if 'computer-science' in doc.filePath.lower():
                print("✅ Department name 'computer-science' found in path!")
            else:
                print("❌ Department name NOT found in path")
                print(f"   Path: {doc.filePath}")
            
            # Check if path contains department code
            if dept.code.lower() in doc.filePath.lower():
                print(f"✅ Department code '{dept.code}' found in path!")
            else:
                print(f"❌ Department code '{dept.code}' NOT found in path")
            
            # Check format
            expected_format = f"{dept.code.lower()}_computer-science"
            if expected_format in doc.filePath.lower():
                print(f"✅ Correct format: {expected_format}")
            else:
                print(f"❌ Expected format: {expected_format}")
                print(f"   Actual path: {doc.filePath}")
    else:
        print("❌ Document upload failed!")
        if admission.document_processing_errors:
            print(f"Errors: {admission.document_processing_errors}")
    
    print("\n" + "=" * 70)
    print("Test Complete!")
    print("=" * 70)

if __name__ == '__main__':
    test_department_name()
