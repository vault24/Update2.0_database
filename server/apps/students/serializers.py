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


def build_profile_photo_url(obj, request=None):
    """
    Absolute URL for a student's profile photo, with a cache-busting `?v=`.

    The version token is derived from the student's last update, so:
      * replacing a photo yields a new URL (no stale image), and
      * browsers that cached a failure for the bare URL (e.g. while /files/
        was misconfigured and 404'd) request the new URL and recover on their
        own — a poisoned cache entry can never strand a user on a broken
        avatar again.

    Returns None when the student has no photo.
    """
    path = (obj.profilePhoto or '').strip()
    if not path:
        return None

    if path.startswith(('http://', 'https://')):
        url = path
    else:
        if not path.startswith('/files/'):
            path = f'/files/{path}'
        url = request.build_absolute_uri(path) if request else path

    updated = getattr(obj, 'updatedAt', None) or getattr(obj, 'updated_at', None)
    if updated is not None:
        try:
            version = int(updated.timestamp())
        except (AttributeError, OSError, ValueError):
            version = None
        if version:
            url = f"{url}{'&' if '?' in url else '?'}v={version}"
    return url


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
        return build_profile_photo_url(obj, self.context.get('request'))


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
        return build_profile_photo_url(obj, self.context.get('request'))


class StudentPublicProfileSerializer(serializers.ModelSerializer):
    """
    The shareable /student/<roll> profile, readable WITHOUT a login.

    Deliberately a strict allow-list, not `exclude`: this payload is reachable
    by anyone and keyed by a guessable roll number, so a field added to the
    model must never become public by accident. Everything here is either
    academic (the point of a verification link) or contact details the
    institute chose to publish.

    NEVER exposed here: NID / father's & mother's NID, date of birth, birth
    certificate number, guardian mobile, and the street-level address — only
    district + division are published.
    """
    department = DepartmentListSerializer(read_only=True)
    departmentName = serializers.CharField(source='department.name', read_only=True, default='')
    profilePhoto = serializers.SerializerMethodField()
    presentAddress = serializers.SerializerMethodField()
    avatarVariant = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id',
            'fullNameEnglish',
            'fullNameBangla',
            'currentRollNumber',
            'department',
            'departmentName',
            'session',
            'semester',
            'shift',
            'status',
            'profilePhoto',
            'avatarVariant',
            # Academic record
            'finalCgpa',
            'semesterResults',
            'semesterAttendance',
            # Contact (published by institute decision)
            'email',
            'mobileStudent',
            'presentAddress',
        ]
        read_only_fields = fields

    def get_profilePhoto(self, obj):
        # STRICT privacy rule: a female student's photo is NEVER published on
        # the public profile, regardless of any visibility toggle. The page
        # renders a generic female avatar instead (see avatarVariant).
        if obj.gender == 'Female':
            return None
        return build_profile_photo_url(obj, self.context.get('request'))

    def get_avatarVariant(self, obj):
        """Which placeholder avatar the public page should render."""
        return 'female' if obj.gender == 'Female' else 'default'

    def get_presentAddress(self, obj):
        """Coarse location only — never the street-level address."""
        address = obj.presentAddress if isinstance(obj.presentAddress, dict) else {}
        return {
            'district': address.get('district', ''),
            'division': address.get('division', ''),
        }


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
