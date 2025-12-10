"""
Authentication Serializers
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password
from .models import User, SignupRequest


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    """
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'account_status',
            'admission_status',
            'related_profile_id',
            'mobile_number',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    # Teacher-specific fields (conditional)
    full_name_english = serializers.CharField(required=False, allow_blank=True)
    full_name_bangla = serializers.CharField(required=False, allow_blank=True)
    designation = serializers.CharField(required=False, allow_blank=True)
    department = serializers.UUIDField(required=False, allow_null=True)
    qualifications = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    specializations = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    office_location = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'role',
            'mobile_number',
            # Teacher-specific fields
            'full_name_english',
            'full_name_bangla',
            'designation',
            'department',
            'qualifications',
            'specializations',
            'office_location',
        ]
    
    def validate(self, attrs):
        """Validate password confirmation and teacher fields"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match'
            })
        
        # Validate teacher fields if role is teacher
        if attrs.get('role') == 'teacher':
            required_teacher_fields = [
                'full_name_english', 'full_name_bangla', 
                'designation', 'department'
            ]
            for field in required_teacher_fields:
                if not attrs.get(field):
                    raise serializers.ValidationError({
                        field: 'This field is required for teacher registration'
                    })
            
            # Validate department exists
            if attrs.get('department'):
                from apps.departments.models import Department
                try:
                    Department.objects.get(id=attrs['department'])
                except Department.DoesNotExist:
                    raise serializers.ValidationError({
                        'department': 'Invalid department selected'
                    })
        
        return attrs
    
    def validate_role(self, value):
        """Validate role selection"""
        # Only allow student, captain, and teacher roles during registration
        # Admin roles should be created through Django admin
        allowed_roles = ['student', 'captain', 'teacher']
        if value not in allowed_roles:
            raise serializers.ValidationError(
                f'Invalid role. Allowed roles: {", ".join(allowed_roles)}'
            )
        return value
    
    def create(self, validated_data):
        """Create user with appropriate account status based on role"""
        from django.db import transaction
        from .services import create_teacher_signup_request, extract_teacher_data_from_request
        
        # Remove password_confirm from validated data
        validated_data.pop('password_confirm')
        
        # Extract teacher-specific data before creating user
        teacher_data = {}
        teacher_fields = [
            'full_name_english', 'full_name_bangla', 'designation', 
            'department', 'qualifications', 'specializations', 'office_location'
        ]
        
        for field in teacher_fields:
            if field in validated_data:
                teacher_data[field] = validated_data.pop(field)
        
        # Extract password
        password = validated_data.pop('password')
        
        # Set account status based on role
        role = validated_data.get('role', 'student')
        if role == 'teacher':
            validated_data['account_status'] = 'pending'
        else:
            validated_data['account_status'] = 'active'
        
        # Set admission status for students and captains
        if role in ['student', 'captain']:
            validated_data['admission_status'] = 'not_started'
        
        # Create user and teacher signup request atomically
        with transaction.atomic():
            # Create user
            user = User.objects.create_user(
                password=password,
                **validated_data
            )
            
            # Create teacher signup request if role is teacher
            if role == 'teacher':
                create_teacher_signup_request(user, teacher_data)
        
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate credentials and check if user can login"""
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            # Authenticate user
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )
            
            if not user:
                # Check if there's a pending or rejected signup request
                try:
                    signup_request = SignupRequest.objects.get(username=username)
                    if signup_request.status == 'pending':
                        raise serializers.ValidationError(
                            'Your signup request is pending approval. Please wait for admin review.',
                            code='authorization'
                        )
                    elif signup_request.status == 'rejected':
                        rejection_msg = 'Your signup request has been rejected.'
                        if signup_request.rejection_reason:
                            rejection_msg += f' Reason: {signup_request.rejection_reason}'
                        raise serializers.ValidationError(
                            rejection_msg,
                            code='authorization'
                        )
                except SignupRequest.DoesNotExist:
                    pass
                
                # Default error message
                raise serializers.ValidationError(
                    'Invalid username or password',
                    code='authorization'
                )
            
            # Check if user can login
            if not user.can_login():
                error_message = user.get_login_error_message()
                error_code = 'authorization'
                
                # Provide specific error code for pending teacher approval
                if user.role == 'teacher' and user.account_status == 'pending':
                    error_code = 'pending_approval'
                
                raise serializers.ValidationError(
                    error_message,
                    code=error_code
                )
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError(
                'Must include "username" and "password"',
                code='authorization'
            )


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Passwords do not match'
            })
        return attrs
    
    def validate_old_password(self, value):
        """Validate old password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value



class SignupRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for creating signup requests
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = SignupRequest
        fields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'requested_role',
            'mobile_number'
        ]
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match'
            })
        return attrs
    
    def validate_username(self, value):
        """Check if username already exists in SignupRequest or User"""
        if SignupRequest.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                'A signup request with this username already exists'
            )
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                'This username is already taken'
            )
        return value
    
    def validate_email(self, value):
        """Check if email already exists in SignupRequest or User"""
        if SignupRequest.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'A signup request with this email already exists'
            )
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'This email is already registered'
            )
        return value
    
    def validate_requested_role(self, value):
        """Validate requested role is an admin role"""
        allowed_roles = ['registrar', 'institute_head']
        if value not in allowed_roles:
            raise serializers.ValidationError(
                f'Invalid role. Allowed roles: {", ".join(allowed_roles)}'
            )
        return value
    
    def create(self, validated_data):
        """Create signup request with hashed password"""
        # Remove password_confirm from validated data
        validated_data.pop('password_confirm')
        
        # Extract and hash password
        password = validated_data.pop('password')
        password_hash = make_password(password)
        
        # Create signup request
        signup_request = SignupRequest.objects.create(
            password_hash=password_hash,
            **validated_data
        )
        
        return signup_request


class SignupRequestListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing signup requests
    """
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
            'status',
            'reviewed_by_name',
            'reviewed_at',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_reviewed_by_name(self, obj):
        """Get the name of the reviewer"""
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip() or obj.reviewed_by.username
        return None


class SignupRequestDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed signup request view
    """
    reviewed_by_details = UserSerializer(source='reviewed_by', read_only=True)
    created_user_details = UserSerializer(source='created_user', read_only=True)
    
    class Meta:
        model = SignupRequest
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'mobile_number',
            'requested_role',
            'status',
            'reviewed_by',
            'reviewed_by_details',
            'reviewed_at',
            'rejection_reason',
            'created_user',
            'created_user_details',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class ApproveSignupRequestSerializer(serializers.Serializer):
    """
    Serializer for approving signup requests
    """
    pass  # No additional fields needed


class RejectSignupRequestSerializer(serializers.Serializer):
    """
    Serializer for rejecting signup requests
    """
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text='Optional reason for rejection'
    )
