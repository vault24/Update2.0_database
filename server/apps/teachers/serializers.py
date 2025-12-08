"""
Teacher Serializers
"""
from rest_framework import serializers
from .models import Teacher
from apps.departments.serializers import DepartmentSerializer


class TeacherListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views
    """
    department = DepartmentSerializer(read_only=True)
    
    class Meta:
        model = Teacher
        fields = [
            'id',
            'fullNameEnglish',
            'designation',
            'department',
            'email',
            'mobileNumber',
            'employmentStatus',
            'profilePhoto'
        ]


class TeacherDetailSerializer(serializers.ModelSerializer):
    """
    Complete serializer with all fields and nested data
    """
    department = DepartmentSerializer(read_only=True)
    
    class Meta:
        model = Teacher
        fields = '__all__'


class TeacherCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating teachers
    """
    
    class Meta:
        model = Teacher
        fields = [
            'fullNameBangla',
            'fullNameEnglish',
            'designation',
            'department',
            'subjects',
            'qualifications',
            'specializations',
            'email',
            'mobileNumber',
            'officeLocation',
            'employmentStatus',
            'joiningDate',
            'profilePhoto',
        ]
    
    def validate_mobile_number(self, value):
        """Validate mobile number"""
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('Mobile number must be 11 digits')
        return value
    
    def validate_email(self, value):
        """Ensure email is unique"""
        if Teacher.objects.filter(email=value).exists():
            raise serializers.ValidationError('A teacher with this email already exists')
        return value


class TeacherUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating teachers
    """
    
    class Meta:
        model = Teacher
        fields = [
            'fullNameBangla',
            'fullNameEnglish',
            'designation',
            'department',
            'subjects',
            'qualifications',
            'specializations',
            'email',
            'mobileNumber',
            'officeLocation',
            'employmentStatus',
            'joiningDate',
            'profilePhoto',
        ]
    
    def validate_mobile_number(self, value):
        """Validate mobile number"""
        if value and (not value.isdigit() or len(value) != 11):
            raise serializers.ValidationError('Mobile number must be 11 digits')
        return value
    
    def validate_email(self, value):
        """Ensure email is unique (excluding current instance)"""
        if value:
            existing = Teacher.objects.filter(email=value).exclude(id=self.instance.id)
            if existing.exists():
                raise serializers.ValidationError('A teacher with this email already exists')
        return value
