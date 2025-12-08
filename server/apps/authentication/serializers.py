"""
Authentication Serializers
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


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
            'mobile_number'
        ]
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match'
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
        # Remove password_confirm from validated data
        validated_data.pop('password_confirm')
        
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
        
        # Create user
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
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
                raise serializers.ValidationError(
                    'Invalid username or password',
                    code='authorization'
                )
            
            # Check if user can login
            if not user.can_login():
                if user.role == 'teacher' and user.account_status == 'pending':
                    raise serializers.ValidationError(
                        'Your teacher account is pending approval. Please wait for admin approval.',
                        code='authorization'
                    )
                elif user.account_status == 'suspended':
                    raise serializers.ValidationError(
                        'Your account has been suspended. Please contact administration.',
                        code='authorization'
                    )
                else:
                    raise serializers.ValidationError(
                        'You are not authorized to login at this time.',
                        code='authorization'
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
