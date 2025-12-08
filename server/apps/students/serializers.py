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
from apps.departments.serializers import DepartmentSerializer


class StudentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views
    """
    department = DepartmentSerializer(read_only=True)
    
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


class StudentDetailSerializer(serializers.ModelSerializer):
    """
    Complete serializer with all fields and nested data
    """
    department = DepartmentSerializer(read_only=True)
    
    class Meta:
        model = Student
        fields = '__all__'


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
