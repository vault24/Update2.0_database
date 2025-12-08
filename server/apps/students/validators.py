"""
Custom validators for Student model
"""
from django.core.exceptions import ValidationError
import re


def validate_mobile_number(value):
    """
    Validate mobile number is exactly 11 digits
    """
    if not value:
        raise ValidationError("Mobile number is required")
    
    if not re.match(r'^\d{11}$', value):
        raise ValidationError("Mobile number must be exactly 11 digits")
    
    return value


def validate_semester(value):
    """
    Validate semester is between 1 and 8
    """
    if value < 1 or value > 8:
        raise ValidationError("Semester must be between 1 and 8")
    
    return value


def validate_gpa(value):
    """
    Validate GPA is between 0.00 and 4.00
    """
    if value < 0 or value > 4:
        raise ValidationError("GPA must be between 0.00 and 4.00")
    
    return value


def validate_address_structure(value):
    """
    Validate address has all required fields
    """
    required_fields = [
        'division', 'district', 'subDistrict', 'policeStation',
        'postOffice', 'municipality', 'village', 'ward'
    ]
    
    if not isinstance(value, dict):
        raise ValidationError("Address must be a dictionary")
    
    missing_fields = [field for field in required_fields if field not in value]
    
    if missing_fields:
        raise ValidationError(f"Address missing required fields: {', '.join(missing_fields)}")
    
    return value


def validate_semester_results_structure(value):
    """
    Validate semester results structure
    Each entry should have either (semester, gpa, cgpa) OR (semester, referredSubjects)
    """
    if not isinstance(value, list):
        raise ValidationError("Semester results must be a list")
    
    for result in value:
        if not isinstance(result, dict):
            raise ValidationError("Each semester result must be a dictionary")
        
        if 'semester' not in result:
            raise ValidationError("Each semester result must have a 'semester' field")
        
        has_referred = 'referredSubjects' in result and result['referredSubjects']
        has_gpa = 'gpa' in result
        
        if has_referred and has_gpa:
            raise ValidationError("Semester result cannot have both GPA and referred subjects")
        
        if not has_referred and not has_gpa:
            raise ValidationError("Semester result must have either GPA or referred subjects")
    
    return value


def validate_semester_attendance_structure(value):
    """
    Validate semester attendance structure
    Each entry should have semester and subjects with present/total counts
    """
    if not isinstance(value, list):
        raise ValidationError("Semester attendance must be a list")
    
    for attendance in value:
        if not isinstance(attendance, dict):
            raise ValidationError("Each semester attendance must be a dictionary")
        
        if 'semester' not in attendance:
            raise ValidationError("Each semester attendance must have a 'semester' field")
        
        if 'subjects' not in attendance:
            raise ValidationError("Each semester attendance must have a 'subjects' field")
        
        subjects = attendance['subjects']
        if not isinstance(subjects, list):
            raise ValidationError("Subjects must be a list")
        
        for subject in subjects:
            if not isinstance(subject, dict):
                raise ValidationError("Each subject must be a dictionary")
            
            required_fields = ['name', 'present', 'total']
            missing_fields = [field for field in required_fields if field not in subject]
            
            if missing_fields:
                raise ValidationError(f"Subject missing required fields: {', '.join(missing_fields)}")
            
            # Validate present and total are non-negative
            if subject['present'] < 0 or subject['total'] < 0:
                raise ValidationError("Present and total counts must be non-negative")
            
            # Validate present <= total
            if subject['present'] > subject['total']:
                raise ValidationError("Present count cannot exceed total count")
    
    return value


def calculate_average_attendance(semester_attendance):
    """
    Calculate average attendance percentage across all semesters
    """
    if not semester_attendance:
        return 0.0
    
    total_present = 0
    total_classes = 0
    
    for attendance in semester_attendance:
        subjects = attendance.get('subjects', [])
        for subject in subjects:
            total_present += subject.get('present', 0)
            total_classes += subject.get('total', 0)
    
    if total_classes == 0:
        return 0.0
    
    return round((total_present / total_classes) * 100, 2)
