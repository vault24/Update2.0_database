"""
Authentication Services
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from apps.teacher_requests.models import TeacherSignupRequest
from apps.departments.models import Department


def create_teacher_signup_request(user, teacher_data):
    """
    Create TeacherSignupRequest from registration data
    
    Args:
        user: The User instance that was created during registration
        teacher_data: Dictionary containing teacher-specific information
        
    Returns:
        TeacherSignupRequest: The created teacher signup request
        
    Raises:
        ValidationError: If required teacher data is missing or invalid
    """
    # Validate required teacher fields
    required_fields = [
        'full_name_english', 'full_name_bangla', 
        'designation', 'department'
    ]
    
    for field in required_fields:
        if not teacher_data.get(field):
            raise ValidationError(f'{field} is required for teacher registration')
    
    # Validate department exists
    try:
        department = Department.objects.get(id=teacher_data['department'])
    except Department.DoesNotExist:
        raise ValidationError('Invalid department selected')
    
    # Create TeacherSignupRequest
    teacher_signup_request = TeacherSignupRequest.objects.create(
        user=user,
        full_name_english=teacher_data['full_name_english'],
        full_name_bangla=teacher_data['full_name_bangla'],
        email=user.email,
        mobile_number=user.mobile_number,
        designation=teacher_data['designation'],
        department=department,
        qualifications=teacher_data.get('qualifications', []),
        specializations=teacher_data.get('specializations', []),
        office_location=teacher_data.get('office_location', ''),
        status='pending'
    )
    
    return teacher_signup_request


def extract_teacher_data_from_request(request_data):
    """
    Extract teacher-specific data from registration request
    
    Args:
        request_data: Dictionary containing registration form data
        
    Returns:
        dict: Teacher-specific data extracted from request
    """
    teacher_fields = [
        'full_name_english', 'full_name_bangla', 'designation', 
        'department', 'qualifications', 'specializations', 'office_location'
    ]
    
    teacher_data = {}
    for field in teacher_fields:
        if field in request_data:
            teacher_data[field] = request_data[field]
    
    return teacher_data


@transaction.atomic
def register_teacher_with_signup_request(user_data, teacher_data):
    """
    Register a teacher user and create associated TeacherSignupRequest atomically
    
    Args:
        user_data: Dictionary containing user registration data
        teacher_data: Dictionary containing teacher-specific data
        
    Returns:
        tuple: (User instance, TeacherSignupRequest instance)
        
    Raises:
        ValidationError: If validation fails for user or teacher data
    """
    from .models import User
    from .serializers import RegisterSerializer
    
    # Create user through serializer for proper validation
    serializer = RegisterSerializer(data=user_data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    user = serializer.save()
    
    try:
        # Create teacher signup request
        teacher_signup_request = create_teacher_signup_request(user, teacher_data)
        return user, teacher_signup_request
    except Exception as e:
        # If teacher signup request creation fails, delete the user
        user.delete()
        raise e