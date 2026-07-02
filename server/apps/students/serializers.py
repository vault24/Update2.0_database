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


def generate_student_identifiers(department, session):
    """
    Generate a readable, unique college Roll Number and Registration Number for
    a new student. Mirrors the format used when an admission is approved.

      Roll Number         -> {DEPT}-{YEAR}-{NNN}   e.g. CST-2025-001
      Registration Number -> {YEAR}{DEPT}{NNN}     e.g. 2025CST001

    Both are guaranteed unique against existing students.
    """
    dept_code = (getattr(department, 'code', None) or 'GEN').upper()
    year = (session.split('-')[0] if session else str(__import__('datetime').date.today().year))

    base_count = Student.objects.filter(department=department, session=session).count()
    seq = base_count + 1
    while True:
        nnn = str(seq).zfill(3)
        roll = f"{dept_code}-{year}-{nnn}"
        registration = f"{year}{dept_code}{nnn}"
        clash = (
            Student.objects.filter(currentRollNumber=roll).exists()
            or Student.objects.filter(currentRegistrationNumber=registration).exists()
        )
        if not clash:
            return roll, registration
        seq += 1


class StudentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating students with validation.

    `currentRollNumber` / `currentRegistrationNumber` are optional — when not
    provided (e.g. the admin "add student" flow) they are generated as readable,
    unique identifiers. A few required-but-administrative fields also fall back
    to sensible defaults.
    """
    currentRollNumber = serializers.CharField(required=False, allow_blank=True)
    currentRegistrationNumber = serializers.CharField(required=False, allow_blank=True)
    emergencyContact = serializers.CharField(required=False, allow_blank=True)
    enrollmentDate = serializers.DateField(required=False)
    highestExam = serializers.CharField(required=False, allow_blank=True)
    registrationNumber = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        from datetime import date

        department = validated_data.get('department')
        session = validated_data.get('session', '')

        # Auto-generate readable identifiers when the admin did not supply them.
        if not validated_data.get('currentRollNumber') or not validated_data.get('currentRegistrationNumber'):
            roll, registration = generate_student_identifiers(department, session)
            validated_data.setdefault('currentRollNumber', '')
            validated_data.setdefault('currentRegistrationNumber', '')
            if not validated_data['currentRollNumber']:
                validated_data['currentRollNumber'] = roll
            if not validated_data['currentRegistrationNumber']:
                validated_data['currentRegistrationNumber'] = registration

        # Sensible fallbacks for administrative fields not collected on the form.
        if not validated_data.get('emergencyContact'):
            validated_data['emergencyContact'] = validated_data.get('guardianMobile', '')
        if not validated_data.get('highestExam'):
            validated_data['highestExam'] = 'SSC'
        if not validated_data.get('enrollmentDate'):
            validated_data['enrollmentDate'] = date.today()
        if not validated_data.get('registrationNumber'):
            # Board registration number; fall back to the SSC roll if absent.
            validated_data['registrationNumber'] = validated_data.get('rollNumber', '') or validated_data['currentRegistrationNumber']

        return super().create(validated_data)

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
            'finalCgpa',
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
            'finalCgpa',
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
