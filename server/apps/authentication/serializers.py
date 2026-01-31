"""
Authentication Serializers
"""
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'first_name', 'last_name', 'role']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
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


class SignupRequestListSerializer(serializers.Serializer):
    """Serializer for listing signup requests"""
    pass


class SignupRequestDetailSerializer(serializers.Serializer):
    """Serializer for signup request details"""
    pass


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
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id', 'username', 'role']


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