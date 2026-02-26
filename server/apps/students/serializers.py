"""
Student Serializers
"""
from rest_framework import serializers
from .models import Student
from .validators import (
    validate_mobile_number,
    validate_semester,
    validate_gpa,
    validate_address_structure,
    validate_semester_results_structure,
    validate_semester_attendance_structure
)
from apps.departments.serializers import DepartmentListSerializer, DepartmentSerializer


class StudentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views
    """
    department = DepartmentListSerializer(read_only=True)
    profilePhoto = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id',
            'fullNameEnglish',
            'currentRollNumber',
            'currentRegistrationNumber',
            'semester',
            'department',
            'status',
            'profilePhoto'
        ]
    
    def get_profilePhoto(self, obj):
        """Return full URL for profile photo"""
        if obj.profilePhoto:
            # Check if it's already a full URL
            if obj.profilePhoto.startswith('http://') or obj.profilePhoto.startswith('https://'):
                return obj.profilePhoto
            # Check if it already starts with /files/
            if obj.profilePhoto.startswith('/files/'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profilePhoto)
                return obj.profilePhoto
            # It's a relative path, prepend /files/
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/files/{obj.profilePhoto}')
            return f'/files/{obj.profilePhoto}'
        return None


class StudentDetailSerializer(serializers.ModelSerializer):
    """
    Complete serializer with all fields and nested data
    """
    department = DepartmentListSerializer(read_only=True)
    profilePhoto = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = '__all__'
    
    def get_profilePhoto(self, obj):
        """Return full URL for profile photo"""
        if obj.profilePhoto:
            # Check if it's already a full URL
            if obj.profilePhoto.startswith('http://') or obj.profilePhoto.startswith('https://'):
                return obj.profilePhoto
            # Check if it already starts with /files/
            if obj.profilePhoto.startswith('/files/'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profilePhoto)
                return obj.profilePhoto
            # It's a relative path, prepend /files/
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/files/{obj.profilePhoto}')
            return f'/files/{obj.profilePhoto}'
        return None


class StudentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating students with validation
    """
    
    class Meta:
        model = Student
        fields = [
            # Personal Information
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'fatherNID',
            'motherName',
            'motherNID',
            'dateOfBirth',
            'birthCertificateNo',
            'nidNumber',
            'gender',
            'religion',
            'bloodGroup',
            'nationality',
            'maritalStatus',
            # Contact Information
            'mobileStudent',
            'guardianMobile',
            'email',
            'emergencyContact',
            'presentAddress',
            'permanentAddress',
            # Educational Background
            'highestExam',
            'board',
            'group',
            'rollNumber',
            'registrationNumber',
            'passingYear',
            'gpa',
            'institutionName',
            # Current Academic Information
            'currentRollNumber',
            'currentRegistrationNumber',
            'semester',
            'department',
            'session',
            'shift',
            'currentGroup',
            'status',
            'enrollmentDate',
            # Academic Records
            'semesterResults',
            'semesterAttendance',
            # Media
            'profilePhoto',
        ]
    
    def validate_mobileStudent(self, value):
        """Validate student mobile number"""
        return validate_mobile_number(value)
    
    def validate_guardianMobile(self, value):
        """Validate guardian mobile number"""
        return validate_mobile_number(value)
    
    def validate_semester(self, value):
        """Validate semester range"""
        return validate_semester(value)
    
    def validate_gpa(self, value):
        """Validate GPA range"""
        return validate_gpa(value)
    
    def validate_presentAddress(self, value):
        """Validate present address structure"""
        return validate_address_structure(value)
    
    def validate_permanentAddress(self, value):
        """Validate permanent address structure"""
        return validate_address_structure(value)
    
    def validate_semesterResults(self, value):
        """Validate semester results structure"""
        if value:  # Only validate if not empty
            return validate_semester_results_structure(value)
        return value
    
    def validate_semesterAttendance(self, value):
        """Validate semester attendance structure"""
        if value:  # Only validate if not empty
            return validate_semester_attendance_structure(value)
        return value


class StudentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating students
    """
    
    class Meta:
        model = Student
        fields = [
            # Personal Information
            'fullNameBangla',
            'fullNameEnglish',
            'fatherName',
            'fatherNID',
            'motherName',
            'motherNID',
            'dateOfBirth',
            'birthCertificateNo',
            'nidNumber',
            'gender',
            'religion',
            'bloodGroup',
            'nationality',
            'maritalStatus',
            # Contact Information
            'mobileStudent',
            'guardianMobile',
            'email',
            'emergencyContact',
            'presentAddress',
            'permanentAddress',
            # Educational Background
            'highestExam',
            'board',
            'group',
            'rollNumber',
            'registrationNumber',
            'passingYear',
            'gpa',
            'institutionName',
            # Current Academic Information
            'currentRollNumber',
            'currentRegistrationNumber',
            'semester',
            'department',
            'session',
            'shift',
            'currentGroup',
            'status',
            'enrollmentDate',
            # Academic Records
            'semesterResults',
            'semesterAttendance',
            # Discontinued Fields
            'discontinuedReason',
            'lastSemester',
            # Media
            'profilePhoto',
        ]
    
    def validate_mobileStudent(self, value):
        """Validate student mobile number"""
        if value:
            return validate_mobile_number(value)
        return value
    
    def validate_guardianMobile(self, value):
        """Validate guardian mobile number"""
        if value:
            return validate_mobile_number(value)
        return value
    
    def validate_semester(self, value):
        """Validate semester range"""
        if value:
            return validate_semester(value)
        return value
    
    def validate_gpa(self, value):
        """Validate GPA range"""
        if value:
            return validate_gpa(value)
        return value
    
    def validate_presentAddress(self, value):
        """Validate present address structure"""
        if value:
            return validate_address_structure(value)
        return value
    
    def validate_permanentAddress(self, value):
        """Validate permanent address structure"""
        if value:
            return validate_address_structure(value)
        return value
    
    def validate_semesterResults(self, value):
        """Validate semester results structure"""
        if value:
            return validate_semester_results_structure(value)
        return value
    
    def validate_semesterAttendance(self, value):
        """Validate semester attendance structure"""
        if value:
            return validate_semester_attendance_structure(value)
        return value
