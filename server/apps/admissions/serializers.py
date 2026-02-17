"""
Admission Serializers
"""
from rest_framework import serializers
from .models import Admission
from apps.departments.serializers import DepartmentSerializer
from apps.authentication.serializers import UserSerializer


class AdmissionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views
    """
    department_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    id = serializers.SerializerMethodField()
    
    class Meta:
        model = Admission
        fields = [
            'id',
            'application_id',
            'full_name_english',
            'email',
            'mobile_student',
            'department_name',
            'desired_shift',
            'session',
            'status',
            'gpa',
            'submitted_at',
            'user_email'
        ]
    
    def get_id(self, obj):
        """Return application_id as id for frontend compatibility"""
        return obj.application_id or str(obj.id)
    
    def get_department_name(self, obj):
        """Safely get department name"""
        try:
            return obj.desired_department.name if obj.desired_department else obj.desired_department
        except:
            return None


class AdmissionDetailSerializer(serializers.ModelSerializer):
    """
    Complete serializer with all fields and nested data
    """
    department_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    reviewed_by_username = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    
    class Meta:
        model = Admission
        fields = '__all__'
    
    def get_id(self, obj):
        """Return application_id as id for frontend compatibility"""
        return obj.application_id or str(obj.id)
    
    def get_department_name(self, obj):
        """Safely get department name"""
        try:
            return obj.desired_department.name if obj.desired_department else None
        except:
            return None
    
    def get_reviewed_by_username(self, obj):
        """Safely get reviewer username"""
        try:
            return obj.reviewed_by.username if obj.reviewed_by else None
        except:
            return None


class AdmissionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating admission applications
    """
    
    class Meta:
        model = Admission
        fields = [
            # Personal Information
            'full_name_bangla',
            'full_name_english',
            'father_name',
            'father_nid',
            'mother_name',
            'mother_nid',
            'date_of_birth',
            'birth_certificate_no',
            'gender',
            'religion',
            'blood_group',
            'nationality',
            # Contact Information
            'mobile_student',
            'guardian_mobile',
            'email',
            'emergency_contact',
            'present_address',
            'permanent_address',
            # Educational Background
            'highest_exam',
            'board',
            'group',
            'roll_number',
            'registration_number',
            'passing_year',
            'gpa',
            'institution_name',
            # Admission Details
            'desired_department',
            'desired_shift',
            'session',
            # Documents
            'documents',
        ]
    
    def validate_mobile_student(self, value):
        """Validate student mobile number"""
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('Mobile number must be 11 digits')
        return value
    
    def validate_guardian_mobile(self, value):
        """Validate guardian mobile number"""
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('Mobile number must be 11 digits')
        return value
    
    def validate_gpa(self, value):
        """Validate GPA range"""
        if value < 0 or value > 5:
            raise serializers.ValidationError('GPA must be between 0 and 5')
        return value
    
    def validate_present_address(self, value):
        """Validate present address structure"""
        required_fields = ['village', 'postOffice', 'upazila', 'district', 'division']
        for field in required_fields:
            if field not in value or not value[field]:
                raise serializers.ValidationError(f'Address must include {field}')
        return value
    
    def validate_permanent_address(self, value):
        """Validate permanent address structure"""
        required_fields = ['village', 'postOffice', 'upazila', 'district', 'division']
        for field in required_fields:
            if field not in value or not value[field]:
                raise serializers.ValidationError(f'Address must include {field}')
        return value
    
    def create(self, validated_data):
        """Create admission with user relationship"""
        # User should be set from the request context
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data['status'] = 'pending'
        
        # Set application_id from user's student_id
        if hasattr(user, 'student_id') and user.student_id:
            validated_data['application_id'] = user.student_id
        
        admission = Admission.objects.create(**validated_data)
        
        # Update user's admission status
        user.admission_status = 'pending'
        user.save()
        
        return admission


class AdmissionApproveSerializer(serializers.Serializer):
    """
    Serializer for approving admissions
    Note: current_roll_number is auto-generated from SSC Board Roll
    """
    review_notes = serializers.CharField(required=False, allow_blank=True)
    
    # Student profile fields
    current_registration_number = serializers.CharField(required=True)
    semester = serializers.IntegerField(required=True, min_value=1, max_value=8)
    current_group = serializers.CharField(required=True)
    enrollment_date = serializers.DateField(required=True)
    
    def validate_current_registration_number(self, value):
        """Ensure registration number is unique"""
        from apps.students.models import Student
        if Student.objects.filter(currentRegistrationNumber=value).exists():
            raise serializers.ValidationError('This registration number is already in use')
        return value


class AdmissionRejectSerializer(serializers.Serializer):
    """
    Serializer for rejecting admissions
    """
    review_notes = serializers.CharField(required=True)
    
    def validate_review_notes(self, value):
        """Ensure rejection reason is provided"""
        if not value or not value.strip():
            raise serializers.ValidationError('Rejection reason is required')
        return value.strip()
