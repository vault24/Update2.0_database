"""
Teacher Request Serializers
"""
from rest_framework import serializers
from .models import TeacherSignupRequest, TeacherRequest
from apps.departments.serializers import DepartmentSerializer
from apps.authentication.serializers import UserSerializer


class TeacherSignupRequestListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = TeacherSignupRequest
        fields = [
            'id',
            'full_name_english',
            'email',
            'mobile_number',
            'designation',
            'department_name',
            'status',
            'submitted_at',
            'user_username'
        ]


class TeacherSignupRequestDetailSerializer(serializers.ModelSerializer):
    """
    Complete serializer with all fields and nested data
    """
    department = DepartmentSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = TeacherSignupRequest
        fields = '__all__'


class TeacherSignupRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating teacher signup requests
    """
    
    class Meta:
        model = TeacherSignupRequest
        fields = [
            'full_name_bangla',
            'full_name_english',
            'email',
            'mobile_number',
            'designation',
            'department',
            'qualifications',
            'specializations',
            'office_location',
        ]
    
    def validate_mobile_number(self, value):
        """Validate mobile number"""
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('Mobile number must be 11 digits')
        return value
    
    def validate_email(self, value):
        """Ensure email is unique"""
        if TeacherSignupRequest.objects.filter(email=value).exists():
            raise serializers.ValidationError('A signup request with this email already exists')
        return value
    
    def create(self, validated_data):
        """Create signup request with user relationship"""
        # User should be set from the request context
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data['status'] = 'pending'
        
        signup_request = TeacherSignupRequest.objects.create(**validated_data)
        return signup_request


class TeacherSignupApproveSerializer(serializers.Serializer):
    """
    Serializer for approving teacher signup requests
    """
    review_notes = serializers.CharField(required=False, allow_blank=True)
    joining_date = serializers.DateField(required=True)
    subjects = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class TeacherSignupRejectSerializer(serializers.Serializer):
    """
    Serializer for rejecting teacher signup requests
    """
    review_notes = serializers.CharField(required=True)
    
    def validate_review_notes(self, value):
        """Ensure rejection reason is provided"""
        if not value or not value.strip():
            raise serializers.ValidationError('Rejection reason is required')
        return value.strip()


class TeacherRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for student-teacher contact requests
    """
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    teacher_name = serializers.CharField(source='teacher.fullNameEnglish', read_only=True)
    
    class Meta:
        model = TeacherRequest
        fields = '__all__'
        read_only_fields = ['requestDate', 'createdAt', 'updatedAt']
