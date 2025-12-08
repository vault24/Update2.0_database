"""
Authentication Views
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import login, logout
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """
    Register a new user
    POST /api/auth/register/
    
    Request body:
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "password_confirm": "string",
        "first_name": "string",
        "last_name": "string",
        "role": "student|captain|teacher",
        "mobile_number": "string"
    }
    
    Returns:
    - 201: User created successfully
    - 400: Validation error
    """
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Return user data
        user_serializer = UserSerializer(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': user_serializer.data,
            'requires_approval': user.role == 'teacher'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """
    Login user
    POST /api/auth/login/
    
    Request body:
    {
        "username": "string",
        "password": "string"
    }
    
    Returns:
    - 200: Login successful
    - 400: Invalid credentials or account not active
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Login user (creates session)
        login(request, user)
        
        # Return user data
        user_serializer = UserSerializer(user)
        
        response_data = {
            'message': 'Login successful',
            'user': user_serializer.data
        }
        
        # Add redirect flag if user needs to complete admission
        if user.needs_admission():
            response_data['redirect_to_admission'] = True
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Logout user
    POST /api/auth/logout/
    
    Returns:
    - 200: Logout successful
    """
    logout(request)
    return Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """
    Get current user profile
    GET /api/auth/me/
    
    Returns:
    - 200: User profile data
    """
    serializer = UserSerializer(request.user)
    
    response_data = {
        'user': serializer.data
    }
    
    # Add redirect flag if user needs to complete admission
    if request.user.needs_admission():
        response_data['redirect_to_admission'] = True
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """
    Change user password
    POST /api/auth/change-password/
    
    Request body:
    {
        "old_password": "string",
        "new_password": "string",
        "new_password_confirm": "string"
    }
    
    Returns:
    - 200: Password changed successfully
    - 400: Validation error
    """
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        # Set new password
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
