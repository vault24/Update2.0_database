"""
Teacher Serializers
"""
from rest_framework import serializers
from .models import (
    Teacher, 
    TeacherExperience, 
    TeacherEducation, 
    TeacherPublication, 
    TeacherResearch, 
    TeacherAward
)
from apps.departments.serializers import DepartmentSerializer


class TeacherListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views
    """
    department = DepartmentSerializer(read_only=True)
    departmentName = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Teacher
        fields = [
            'id',
            'fullNameEnglish',
            'designation',
            'department',
            'departmentName',
            'email',
            'mobileNumber',
            'employmentStatus',
            'profilePhoto',
            'shifts'
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
            'shifts',
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
            'shifts',
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



class TeacherExperienceSerializer(serializers.ModelSerializer):
    """Serializer for teacher work experience"""
    
    class Meta:
        model = TeacherExperience
        fields = ['id', 'title', 'institution', 'location', 'startDate', 'endDate', 'current', 'description', 'order']
        read_only_fields = ['id']


class TeacherEducationSerializer(serializers.ModelSerializer):
    """Serializer for teacher education"""
    
    class Meta:
        model = TeacherEducation
        fields = ['id', 'degree', 'institution', 'year', 'field', 'order']
        read_only_fields = ['id']


class TeacherPublicationSerializer(serializers.ModelSerializer):
    """Serializer for teacher publications"""
    
    class Meta:
        model = TeacherPublication
        fields = ['id', 'title', 'journal', 'year', 'citations', 'link', 'order']
        read_only_fields = ['id']


class TeacherResearchSerializer(serializers.ModelSerializer):
    """Serializer for teacher research projects"""
    
    class Meta:
        model = TeacherResearch
        fields = ['id', 'title', 'status', 'year', 'description', 'order']
        read_only_fields = ['id']


class TeacherAwardSerializer(serializers.ModelSerializer):
    """Serializer for teacher awards"""
    
    class Meta:
        model = TeacherAward
        fields = ['id', 'title', 'issuer', 'year', 'order']
        read_only_fields = ['id']


class TeacherProfileSerializer(serializers.ModelSerializer):
    """
    Complete profile serializer with all related data
    """
    department = DepartmentSerializer(read_only=True)
    experiences = TeacherExperienceSerializer(many=True, read_only=True)
    education = TeacherEducationSerializer(many=True, read_only=True)
    publications = TeacherPublicationSerializer(many=True, read_only=True)
    research = TeacherResearchSerializer(many=True, read_only=True)
    awards = TeacherAwardSerializer(many=True, read_only=True)
    
    class Meta:
        model = Teacher
        fields = [
            'id',
            'fullNameBangla',
            'fullNameEnglish',
            'designation',
            'department',
            'subjects',
            'qualifications',
            'specializations',
            'shifts',
            'email',
            'mobileNumber',
            'officeLocation',
            'employmentStatus',
            'joiningDate',
            'profilePhoto',
            'coverPhoto',
            'headline',
            'about',
            'skills',
            'experiences',
            'education',
            'publications',
            'research',
            'awards',
            'createdAt',
            'updatedAt'
        ]
