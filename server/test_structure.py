"""
Test the new storage structure without year
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from utils.structured_file_storage import structured_storage

def test_structure():
    print("=" * 60)
    print("Testing Storage Structure (No Year)")
    print("=" * 60)
    
    # Test student document path
    student_data = {
        'department_code': '85',
        'department_name': 'Computer Science',
        'session': '2024-2025',
        'shift': '1st-shift',
        'student_name': 'Md Mahadi',
        'student_id': 'SIPI-889900',
    }
    
    print("\nStudent Document Path:")
    print("-" * 60)
    student_path = structured_storage.get_student_documents_path(student_data)
    print(f"Full path: {student_path}")
    print(f"\nExpected: Student_Documents/85_computer-science/2024-2025/1st-shift/MdMahadi_SIPI-889900")
    
    # Check structure
    path_str = str(student_path).replace('\\', '/')
    
    if '85_computer-science' in path_str:
        print("✅ Department format: dept-code_dept-name")
    else:
        print("❌ Department format incorrect")
    
    if 'MdMahadi_SIPI-889900' in path_str or 'mdmahadi_sipi-889900' in path_str.lower():
        print("✅ Student format: student-name_student-id")
    else:
        print("❌ Student format incorrect")
    
    if '/2026/' not in path_str and '/2025/' not in path_str and '/2024/' not in path_str:
        print("✅ No year in path")
    else:
        print("❌ Year found in path (should not be there)")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == '__main__':
    test_structure()
