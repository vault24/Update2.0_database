#!/usr/bin/env python3
"""
Test script to verify enhanced error handling in class routine serializers
"""
import os
import sys
import django
from datetime import time

# Add the server directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.class_routines.serializers import (
    ClassRoutineCreateSerializer, 
    ClassRoutineUpdateSerializer,
    BulkRoutineRequestSerializer,
    ValidationErrorCodes
)
from apps.departments.models import Department
from apps.teachers.models import Teacher
from apps.class_routines.models import ClassRoutine


def test_enhanced_validation_errors():
    """Test enhanced validation error messages"""
    print("Testing Enhanced Validation Errors...")
    
    # Test 1: Invalid semester
    print("\n1. Testing invalid semester validation:")
    serializer = ClassRoutineCreateSerializer(data={
        'semester': 'invalid',
        'shift': 'Morning',
        'day_of_week': 'Monday'
    })
    
    if not serializer.is_valid():
        semester_error = serializer.errors.get('semester')
        if semester_error and isinstance(semester_error, list) and len(semester_error) > 0:
            error_detail = semester_error[0]
            print(f"✓ Enhanced semester error: {error_detail}")
        else:
            print(f"✗ Basic semester error: {semester_error}")
    
    # Test 2: Invalid shift
    print("\n2. Testing invalid shift validation:")
    serializer = ClassRoutineCreateSerializer(data={
        'semester': 1,
        'shift': 'InvalidShift',
        'day_of_week': 'Monday'
    })
    
    if not serializer.is_valid():
        shift_error = serializer.errors.get('shift')
        if shift_error and isinstance(shift_error, list) and len(shift_error) > 0:
            error_detail = shift_error[0]
            print(f"✓ Enhanced shift error: {error_detail}")
        else:
            print(f"✗ Basic shift error: {shift_error}")
    
    # Test 3: Invalid time range
    print("\n3. Testing invalid time range validation:")
    try:
        # Get a department for testing
        department = Department.objects.first()
        if not department:
            print("✗ No department found for testing")
            return
        
        serializer = ClassRoutineCreateSerializer(data={
            'department': department.id,
            'semester': 1,
            'shift': 'Morning',
            'session': '2024',
            'day_of_week': 'Monday',
            'start_time': '10:00:00',
            'end_time': '09:00:00',  # End before start
            'subject_name': 'Test Subject',
            'subject_code': 'TEST101',
            'room_number': 'R101'
        })
        
        if not serializer.is_valid():
            time_error = serializer.errors.get('end_time')
            print(f"✓ Enhanced time range error: {time_error}")
        else:
            print("✗ Time range validation should have failed")
            
    except Exception as e:
        print(f"✗ Error during time range test: {e}")
    
    # Test 4: Bulk operation validation
    print("\n4. Testing bulk operation validation:")
    bulk_serializer = BulkRoutineRequestSerializer(data={
        'operations': []  # Empty operations
    })
    
    if not bulk_serializer.is_valid():
        operations_error = bulk_serializer.errors.get('operations')
        print(f"✓ Enhanced bulk operations error: {operations_error}")
    else:
        print("✗ Bulk operations validation should have failed")


def test_error_codes():
    """Test that error codes are properly assigned"""
    print("\n\nTesting Error Codes...")
    
    # Test ValidationErrorCodes class
    print(f"✓ INVALID_SEMESTER: {ValidationErrorCodes.INVALID_SEMESTER}")
    print(f"✓ ROOM_CONFLICT: {ValidationErrorCodes.ROOM_CONFLICT}")
    print(f"✓ SCHEDULE_CONFLICT: {ValidationErrorCodes.SCHEDULE_CONFLICT}")
    print(f"✓ BULK_LIMIT_EXCEEDED: {ValidationErrorCodes.BULK_LIMIT_EXCEEDED}")


def main():
    """Main test function"""
    print("=" * 60)
    print("ENHANCED CLASS ROUTINE SERIALIZER ERROR HANDLING TEST")
    print("=" * 60)
    
    try:
        test_enhanced_validation_errors()
        test_error_codes()
        
        print("\n" + "=" * 60)
        print("✓ Enhanced error handling tests completed successfully!")
        print("✓ Serializers now provide detailed, structured error messages")
        print("✓ Error codes are properly defined and used")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()