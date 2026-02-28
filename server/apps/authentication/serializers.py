"""
Authentication Serializers
"""
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import models
from .models import SignupRequest

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Student-specific fields
    ssc_board_roll = serializers.CharField(required=False, allow_blank=True)
    
    # Teacher-specific fields
    full_name_english = serializers.CharField(required=False, allow_blank=True)
    full_name_bangla = serializers.CharField(required=False, allow_blank=True)
    designation = serializers.CharField(required=False, allow_blank=True)
    department = serializers.UUIDField(required=False, allow_null=True)
    qualifications = serializers.ListField(required=False, default=list)
    specializations = serializers.ListField(required=False, default=list)
    office_location = serializers.CharField(required=False, allow_blank=True)
    mobile_number = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password', 
            'first_name', 'last_name', 'role', 'mobile_number',
            # Student-specific fields
            'ssc_board_roll',
            # Teacher-specific fields
            'full_name_english', 'full_name_bangla', 'designation',
            'department', 'qualifications', 'specializations', 'office_location'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate student-specific fields if role is student or captain
        if attrs.get('role') in ['student', 'captain']:
            if not attrs.get('ssc_board_roll'):
                raise serializers.ValidationError({
                    'ssc_board_roll': 'SSC Board Roll is required for student registration'
                })
            # Validate SSC Board Roll format (should be numeric)
            ssc_roll = attrs.get('ssc_board_roll', '').strip()
            if not ssc_roll.isdigit():
                raise serializers.ValidationError({
                    'ssc_board_roll': 'SSC Board Roll must contain only numbers'
                })
            
            # Check for duplicate SSC Board Roll (check base ID and any with suffixes)
            student_id_base = f"SIPI-{ssc_roll}"
            # Check exact match or any with suffix pattern
            if User.objects.filter(
                student_id__startswith=student_id_base
            ).filter(
                models.Q(student_id=student_id_base) | 
                models.Q(student_id__regex=f'^{student_id_base}-[0-9]+$')
            ).exists():
                raise serializers.ValidationError({
                    'ssc_board_roll': 'This SSC Board Roll is already registered. Please contact admin if this is an error.'
                })
        
        # Validate teacher-specific fields if role is teacher
        if attrs.get('role') == 'teacher':
            required_fields = ['full_name_english', 'full_name_bangla', 'designation', 'department']
            missing_fields = [field for field in required_fields if not attrs.get(field)]
            if missing_fields:
                raise serializers.ValidationError({
                    field: f"{field.replace('_', ' ').title()} is required for teacher registration"
                    for field in missing_fields
                })
        
        return attrs
    
    def create(self, validated_data):
        # Extract student-specific fields
        ssc_board_roll = validated_data.pop('ssc_board_roll', '')
        
        # Extract teacher-specific fields
        teacher_fields = {
            'full_name_english': validated_data.pop('full_name_english', ''),
            'full_name_bangla': validated_data.pop('full_name_bangla', ''),
            'designation': validated_data.pop('designation', ''),
            'department': validated_data.pop('department', None),
            'qualifications': validated_data.pop('qualifications', []),
            'specializations': validated_data.pop('specializations', []),
            'office_location': validated_data.pop('office_location', ''),
        }
        
        validated_data.pop('confirm_password')
        
        # Set account_status based on role
        if validated_data.get('role') == 'teacher':
            validated_data['account_status'] = 'pending'
        else:
            validated_data['account_status'] = 'active'
        
        # Generate Student ID from SSC Board Roll for students and captains
        if validated_data.get('role') in ['student', 'captain'] and ssc_board_roll:
            validated_data['student_id'] = f"SIPI-{ssc_board_roll}"
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create TeacherSignupRequest if role is teacher
        if user.role == 'teacher':
            from apps.teacher_requests.models import TeacherSignupRequest
            from apps.departments.models import Department
            
            department = Department.objects.get(id=teacher_fields['department'])
            
            TeacherSignupRequest.objects.create(
                user=user,
                full_name_english=teacher_fields['full_name_english'],
                full_name_bangla=teacher_fields['full_name_bangla'],
                email=user.email,
                mobile_number=validated_data.get('mobile_number', ''),
                designation=teacher_fields['designation'],
                department=department,
                qualifications=teacher_fields['qualifications'],
                specializations=teacher_fields['specializations'],
                office_location=teacher_fields['office_location'],
                status='pending'
            )
        
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField()
    remember_me = serializers.BooleanField(required=False, default=False)
    
    def validate(self, attrs):
        """Validate login credentials"""
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError('Username and password are required')
        
        # Try to authenticate user
        from django.contrib.auth import authenticate, get_user_model
        User = get_user_model()
        
        # Try to find user by email or username
        user = None
        try:
            # First try by email
            if '@' in username:
                user = User.objects.get(email=username)
            else:
                # Then try by username
                user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials')
        
        # Check if user can login
        if not user.can_login():
            raise serializers.ValidationError(user.get_login_error_message())
        
        # Verify password
        if not user.check_password(password):
            raise serializers.ValidationError('Invalid credentials')
        
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs


class SignupRequestSerializer(serializers.Serializer):
    """Serializer for signup requests"""
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    mobile_number = serializers.CharField(required=False)
    requested_role = serializers.CharField()
    password = serializers.CharField()
    password_confirm = serializers.CharField()
    
    def validate(self, data):
        """Validate the signup request data"""
        # Check if passwords match
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match"})
        
        # Check if username already exists
        if User.objects.filter(username=data.get('username')).exists():
            raise serializers.ValidationError({"username": "Username already exists"})
        
        # Check if email already exists
        if User.objects.filter(email=data.get('email')).exists():
            raise serializers.ValidationError({"email": "Email already exists"})
        
        # Check if there's already a pending request with this username or email
        from .models import SignupRequest
        if SignupRequest.objects.filter(username=data.get('username'), status='pending').exists():
            raise serializers.ValidationError({"username": "A signup request with this username is already pending"})
        
        if SignupRequest.objects.filter(email=data.get('email'), status='pending').exists():
            raise serializers.ValidationError({"email": "A signup request with this email is already pending"})
        
        return data
    
    def create(self, validated_data):
        """Create a new signup request"""
        from .models import SignupRequest
        from django.contrib.auth.hashers import make_password
        
        # Remove password_confirm as it's not needed in the model
        validated_data.pop('password_confirm', None)
        
        # Hash the password
        password = validated_data.pop('password')
        password_hash = make_password(password)
        
        # Create the signup request
        signup_request = SignupRequest.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            mobile_number=validated_data.get('mobile_number', ''),
            requested_role=validated_data['requested_role'],
            password_hash=password_hash,
            status='pending'
        )
        
        return signup_request


class SignupRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing signup requests"""
    class Meta:
        model = SignupRequest
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'requested_role',
            'mobile_number',
            'status',
            'created_at',
            'reviewed_at',
            'reviewed_by',
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by']


class SignupRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer for signup request details"""
    reviewed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SignupRequest
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'requested_role',
            'mobile_number',
            'status',
            'rejection_reason',
            'created_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by']
    
    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}"
        return None


class ApproveSignupRequestSerializer(serializers.Serializer):
    """Serializer for approving signup requests"""
    pass


class RejectSignupRequestSerializer(serializers.Serializer):
    """Serializer for rejecting signup requests"""
    reason = serializers.CharField(required=False)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate email format"""
        # Basic email format validation (already handled by EmailField)
        # Additional custom validation can be added here
        if not value:
            raise serializers.ValidationError("Email is required")
        
        # Normalize email
        value = value.lower().strip()
        
        # Additional email format validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Please enter a valid email address")
        
        return value


class OTPVerificationSerializer(serializers.Serializer):
    """Serializer for OTP verification"""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    
    def validate_email(self, value):
        """Validate email format"""
        if not value:
            raise serializers.ValidationError("Email is required")
        
        # Normalize email
        value = value.lower().strip()
        
        # Email format validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Please enter a valid email address")
        
        return value
    
    def validate_otp(self, value):
        """Validate OTP format"""
        if not value:
            raise serializers.ValidationError("OTP is required")
        
        # Remove any whitespace
        value = value.strip()
        
        # Check if OTP is exactly 6 digits
        if len(value) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 digits")
        
        # Check if OTP contains only digits
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only numbers")
        
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)
    
    def validate_email(self, value):
        """Validate email format"""
        if not value:
            raise serializers.ValidationError("Email is required")
        
        # Normalize email
        value = value.lower().strip()
        
        # Email format validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Please enter a valid email address")
        
        return value
    
    def validate_otp(self, value):
        """Validate OTP format"""
        if not value:
            raise serializers.ValidationError("OTP is required")
        
        # Remove any whitespace
        value = value.strip()
        
        # Check if OTP is exactly 6 digits
        if len(value) != 6:
            raise serializers.ValidationError("OTP must be exactly 6 digits")
        
        # Check if OTP contains only digits
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only numbers")
        
        return value
    
    def validate_new_password(self, value):
        """Validate new password strength"""
        if not value:
            raise serializers.ValidationError("New password is required")
        
        # Use Django's built-in password validators
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        
        # Additional custom password validation
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        # Check for at least one letter and one number
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError("Password must contain at least one letter")
        
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one number")
        
        return value
    
    def validate(self, attrs):
        """Validate that passwords match"""
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        if new_password and confirm_password:
            if new_password != confirm_password:
                raise serializers.ValidationError({
                    'confirm_password': 'Passwords do not match'
                })
        
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer for responses"""
    semester = serializers.SerializerMethodField()
    student_status = serializers.SerializerMethodField()
    is_alumni = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'related_profile_id', 'student_id', 'admission_status', 'account_status',
            'mobile_number', 'semester', 'student_status', 'is_alumni',
            'last_login', 'date_joined'
        ]
        read_only_fields = ['id', 'username', 'role', 'student_id', 'last_login', 'date_joined']
    
    def get_semester(self, obj):
        """Get student's current semester"""
        if obj.role in ['student', 'captain'] and obj.related_profile_id:
            try:
                from apps.students.models import Student
                student = Student.objects.get(id=obj.related_profile_id)
                return student.semester
            except Student.DoesNotExist:
                pass
        return None
    
    def get_student_status(self, obj):
        """Get student's status (active, graduated, etc.)"""
        if obj.role in ['student', 'captain'] and obj.related_profile_id:
            try:
                from apps.students.models import Student
                student = Student.objects.get(id=obj.related_profile_id)
                return student.status
            except Student.DoesNotExist:
                pass
        return None
    
    def get_is_alumni(self, obj):
        """Check if user has alumni status"""
        if obj.role in ['student', 'captain'] and obj.related_profile_id:
            try:
                from apps.students.models import Student
                from apps.alumni.models import Alumni
                student = Student.objects.get(id=obj.related_profile_id)
                # Check if student is graduated or has alumni record
                return student.status == 'graduated' or Alumni.objects.filter(student=student).exists()
            except (Student.DoesNotExist, Alumni.DoesNotExist):
                pass
        elif obj.role == 'alumni':
            return True
        return False
    
    def to_representation(self, instance):
        """Customize the representation based on user role"""
        data = super().to_representation(instance)
        
        # Keep related_profile_id for teachers; remove student-only fields.
        if instance.role == 'teacher':
            data.pop('student_id', None)
            data.pop('admission_status', None)
            data.pop('semester', None)
            data.pop('student_status', None)
            data.pop('is_alumni', None)
        # Remove student-specific fields for other non-student users.
        elif instance.role not in ['student', 'captain', 'alumni']:
            data.pop('student_id', None)
            data.pop('admission_status', None)
            data.pop('semester', None)
            data.pop('student_status', None)
            data.pop('is_alumni', None)
            data.pop('related_profile_id', None)
        else:
            # For students, if related_profile_id is null, use the user's ID as fallback
            if not data.get('related_profile_id'):
                data['related_profile_id'] = str(instance.id)
        
        return data


class PasswordResetResponseSerializer(serializers.Serializer):
    """Serializer for password reset responses"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    remaining_attempts = serializers.IntegerField(required=False)
    
    
class OTPVerificationResponseSerializer(serializers.Serializer):
    """Serializer for OTP verification responses"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    verified = serializers.BooleanField(required=False)


class PasswordResetConfirmResponseSerializer(serializers.Serializer):
    """Serializer for password reset confirmation responses"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    user = UserSerializer(required=False)
