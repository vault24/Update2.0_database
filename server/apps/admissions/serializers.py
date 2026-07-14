"""
Admission Serializers
"""
from rest_framework import serializers
from .models import Admission, AdmissionSettings, DEFAULT_DOCUMENT_REQUIREMENTS
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
        except Exception:
            return None


class AdmissionDetailSerializer(serializers.ModelSerializer):
    """
    Complete serializer with all fields and nested data
    """
    department_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    reviewed_by_username = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    uuid = serializers.SerializerMethodField()
    
    class Meta:
        model = Admission
        fields = '__all__'
    
    def get_id(self, obj):
        """Return application_id as id for frontend compatibility"""
        return obj.application_id or str(obj.id)
    
    def get_uuid(self, obj):
        """Return the actual UUID for operations that require it"""
        return str(obj.id)
    
    def get_department_name(self, obj):
        """Safely get department name"""
        try:
            return obj.desired_department.name if obj.desired_department else None
        except Exception:
            return None
    
    def get_reviewed_by_username(self, obj):
        """Safely get reviewer username"""
        try:
            return obj.reviewed_by.username if obj.reviewed_by else None
        except Exception:
            return None


class AdmissionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating admission applications
    """
    # Permanent address is mandatory — the form cannot be submitted without it
    # (the model field stays nullable for legacy rows).
    permanent_address = serializers.JSONField(required=True)

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
            'marital_status',
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
            # Current Academic Information (dynamic, optional for 2nd sem+)
            'semester',
            'previous_gpas',
            'current_roll_number',
            'current_registration_number',
            # Documents
            'documents',
        ]

    # These are all optional — 1st-semester admissions omit them entirely, and
    # legacy clients that don't send them still work.
    semester = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=8)
    previous_gpas = serializers.JSONField(required=False)
    current_roll_number = serializers.CharField(required=False, allow_blank=True)
    current_registration_number = serializers.CharField(required=False, allow_blank=True)

    def validate_previous_gpas(self, value):
        """Normalise the optional prior-GPA list; tolerate empty/absent input."""
        if not value:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('previous_gpas must be a list')
        cleaned = []
        for entry in value:
            if not isinstance(entry, dict):
                continue
            sem = entry.get('semester')
            gpa = entry.get('gpa')
            if gpa in (None, ''):
                continue
            try:
                gpa_val = float(gpa)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Each GPA must be a number')
            if gpa_val < 0 or gpa_val > 5:
                raise serializers.ValidationError('Each GPA must be between 0 and 5')
            cleaned.append({'semester': int(sem) if sem else len(cleaned) + 1, 'gpa': gpa_val})
        return cleaned

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
        """Validate present address structure (village is optional on the form)"""
        required_fields = ['postOffice', 'upazila', 'district', 'division']
        for field in required_fields:
            if field not in value or not value[field]:
                raise serializers.ValidationError(f'Address must include {field}')
        return value

    def validate_permanent_address(self, value):
        """Validate the (required) permanent address structure"""
        if not value or not isinstance(value, dict):
            raise serializers.ValidationError('Permanent address is required')
        required_fields = ['postOffice', 'upazila', 'district', 'division']
        for field in required_fields:
            if field not in value or not value[field]:
                raise serializers.ValidationError(f'Permanent address must include {field}')
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
    Serializer for approving admissions.

    Roll/Registration and semester now flow primarily from the admission record
    itself (see AdmissionViewSet.approve): if the applicant supplied a current
    roll/registration they are used verbatim, otherwise both are auto-generated.
    All of the fields here are therefore optional overrides — this keeps older
    admin clients (which posted placeholder values) working while letting the
    applicant-selected semester take effect.
    """
    review_notes = serializers.CharField(required=False, allow_blank=True)

    # Optional overrides — resolved against the admission in the view.
    current_roll_number = serializers.CharField(required=False, allow_blank=True)
    current_registration_number = serializers.CharField(required=False, allow_blank=True)
    semester = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=8)
    current_group = serializers.CharField(required=False, allow_blank=True)
    enrollment_date = serializers.DateField(required=False)

    def validate_current_registration_number(self, value):
        """Ensure a supplied registration number is unique."""
        if not value:
            return value
        from apps.students.models import Student
        if Student.objects.filter(currentRegistrationNumber=value).exists():
            raise serializers.ValidationError('This registration number is already in use')
        return value

    def validate_current_roll_number(self, value):
        """Ensure a supplied roll number is unique."""
        if not value:
            return value
        from apps.students.models import Student
        if Student.objects.filter(currentRollNumber=value).exists():
            raise serializers.ValidationError('This roll number is already in use')
        return value


class AdmissionSettingsSerializer(serializers.ModelSerializer):
    """Read/update serializer for the singleton admission settings."""
    document_requirements = serializers.JSONField(required=False)

    class Meta:
        model = AdmissionSettings
        fields = [
            'id',
            'is_admission_enabled',
            'document_requirements',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def to_representation(self, instance):
        """Always expose defaults overlaid with stored overrides."""
        data = super().to_representation(instance)
        data['document_requirements'] = instance.merged_document_requirements()
        return data

    def validate_document_requirements(self, value):
        """Keep only known document fields, coerced to booleans."""
        if not isinstance(value, dict):
            raise serializers.ValidationError('document_requirements must be an object')
        cleaned = {}
        for key in DEFAULT_DOCUMENT_REQUIREMENTS:
            cleaned[key] = bool(value.get(key, DEFAULT_DOCUMENT_REQUIREMENTS[key]))
        return cleaned


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
