"""
Authentication Views
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    SignupRequestSerializer,
    SignupRequestListSerializer,
    SignupRequestDetailSerializer,
    ApproveSignupRequestSerializer,
    RejectSignupRequestSerializer,
)
from .models import SignupRequest
from django.utils import timezone
from django.db import transaction
from django.conf import settings


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """
    Get CSRF token
    GET /api/auth/csrf/

    Returns:
    - 200: CSRF token set in cookie
    """
    try:
        return Response(
            {
                'detail': 'CSRF cookie set',
                'csrfToken': get_token(request),
            },
            status=status.HTTP_200_OK
        )
    except Exception as e:
        import traceback
        return Response(
            {
                'error': 'Failed to get CSRF token',
                'details': str(e),
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        "mobile_number": "string",
        
        // Teacher-specific fields (required if role is teacher)
        "full_name_english": "string",
        "full_name_bangla": "string",
        "designation": "string",
        "department": "uuid",
        "qualifications": ["string"],
        "specializations": ["string"],
        "office_location": "string"
    }
    
    Returns:
    - 201: User created successfully
    - 400: Validation error
    """
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            
            # Auto-login user after successful registration (except for teachers who need approval)
            auto_logged_in = False
            if user.role != 'teacher' and user.account_status == 'active':
                login(request, user)
                auto_logged_in = True
                
                # Set session expiry (24 hours default)
                request.session.set_expiry(86400)
            
            # Return user data
            user_serializer = UserSerializer(user)
            
            response_data = {
                'message': 'User registered successfully',
                'user': user_serializer.data,
                'requires_approval': user.role == 'teacher',
                'auto_logged_in': auto_logged_in,
            }
            
            # Add specific message for teachers
            if user.role == 'teacher':
                response_data['message'] = 'Teacher registration submitted successfully. Please wait for admin approval.'
            else:
                response_data['message'] = 'Registration successful. You are now logged in.'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {
                    'error': 'Registration failed',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
        "password": "string",
        "remember_me": "boolean" (optional, defaults to false)
    }
    
    Returns:
    - 200: Login successful
    - 400: Invalid credentials or account not active
    """
    try:
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Login user (creates session)
            login(request, user)
            
            # Handle "Remember Me" functionality
            remember_me = request.data.get('remember_me', False)
            if remember_me:
                # Set session to expire in 7 days (604800 seconds)
                request.session.set_expiry(604800)
            else:
                # Use default session timeout (24 hours)
                request.session.set_expiry(86400)
            
            # Return user data
            user_serializer = UserSerializer(user)
            
            response_data = {
                'message': 'Login successful',
                'user': user_serializer.data,
                'remember_me': remember_me,
            }
            
            # Add redirect flag if user needs to complete admission
            if hasattr(user, 'needs_admission') and callable(user.needs_admission):
                if user.needs_admission():
                    response_data['redirect_to_admission'] = True
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        return Response(
            {
                'error': 'Login failed',
                'details': str(e),
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Logout user
    POST /api/auth/logout/
    
    Returns:
    - 200: Logout successful
    """
    # Clear the session
    request.session.flush()
    
    # Logout user (removes authentication)
    logout(request)
    
    # Create response
    response = Response(
        {
            'message': 'Logout successful'
        },
        status=status.HTTP_200_OK
    )
    
    # Explicitly delete session cookie
    response.delete_cookie('sessionid')
    
    return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """
    Get current user profile
    GET /api/auth/me/
    
    Returns:
    - 200: User profile data
    """
    try:
        serializer = UserSerializer(request.user)
        
        response_data = {
            'user': serializer.data
        }
        
        # Add redirect flag if user needs to complete admission
        if hasattr(request.user, 'needs_admission') and callable(request.user.needs_admission):
            if request.user.needs_admission():
                response_data['redirect_to_admission'] = True
        
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        return Response(
            {
                'error': 'Failed to get user profile',
                'details': str(e),
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
        
        return Response(
            {
                'message': 'Password changed successfully'
            },
            status=status.HTTP_200_OK
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# Signup Request Views

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def create_signup_request_view(request):
    """
    Create a new signup request
    POST /api/auth/signup-request/
    
    Request body:
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "password_confirm": "string",
        "first_name": "string",
        "last_name": "string",
        "requested_role": "registrar|institute_head",
        "mobile_number": "string"
    }
    
    Returns:
    - 201: Signup request created successfully
    - 400: Validation error
    """
    try:
        serializer = SignupRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            signup_request = serializer.save()
            
            return Response(
                {
                    'message': 'Signup request submitted successfully. Please wait for admin approval.',
                    'signup_request': {
                        'id': str(signup_request.id),
                        'username': signup_request.username,
                        'email': signup_request.email,
                        'status': signup_request.status
                    }
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        return Response(
            {
                'error': 'Failed to create signup request',
                'details': str(e),
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_signup_requests_view(request):
    """
    List all signup requests with optional filtering
    GET /api/auth/signup-requests/
    
    Query parameters:
    - status: Filter by status (pending, approved, rejected)
    - search: Search by username, email, first_name, or last_name
    
    Returns:
    - 200: List of signup requests
    - 403: User is not an admin
    """
    # Check if user is admin
    if not request.user.is_admin():
        return Response(
            {'detail': 'You do not have permission to perform this action.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get queryset
    queryset = SignupRequest.objects.all()
    
    # Filter by status
    status_filter = request.query_params.get('status', None)
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    # Search
    search = request.query_params.get('search', None)
    if search:
        from django.db.models import Q
        queryset = queryset.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )
    
    # Serialize and return
    serializer = SignupRequestListSerializer(queryset, many=True)
    
    return Response(
        {
            'signup_requests': serializer.data,
            'count': queryset.count()
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_signup_request_view(request, request_id):
    """
    Get detailed information about a specific signup request
    GET /api/auth/signup-requests/:id/
    
    Returns:
    - 200: Signup request details
    - 403: User is not an admin
    - 404: Signup request not found
    """
    # Check if user is admin
    if not request.user.is_admin():
        return Response(
            {'detail': 'You do not have permission to perform this action.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        signup_request = SignupRequest.objects.get(id=request_id)
    except SignupRequest.DoesNotExist:
        return Response(
            {'detail': 'Signup request not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SignupRequestDetailSerializer(signup_request)
    
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def approve_signup_request_view(request, request_id):
    """
    Approve a pending signup request
    POST /api/auth/signup-requests/:id/approve/
    
    Returns:
    - 200: Signup request approved successfully
    - 400: Invalid status transition
    - 403: User is not an admin
    - 404: Signup request not found
    """
    # Check if user is admin
    if not request.user.is_admin():
        return Response(
            {'detail': 'You do not have permission to perform this action.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        signup_request = SignupRequest.objects.get(id=request_id)
    except SignupRequest.DoesNotExist:
        return Response(
            {'detail': 'Signup request not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if request is pending
    if signup_request.status != 'pending':
        return Response(
            {'detail': 'Cannot approve a request that is not pending.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create user account in a transaction
    try:
        with transaction.atomic():
            # Create user with the already-hashed password
            from .models import User
            user = User(
                username=signup_request.username,
                email=signup_request.email,
                first_name=signup_request.first_name,
                last_name=signup_request.last_name,
                role=signup_request.requested_role,
                mobile_number=signup_request.mobile_number,
                account_status='active',
                password=signup_request.password_hash  # Already hashed
            )
            user.save()
            
            # Update signup request
            signup_request.status = 'approved'
            signup_request.reviewed_by = request.user
            signup_request.reviewed_at = timezone.now()
            signup_request.created_user = user
            signup_request.save()
            
            return Response(
                {
                    'message': 'Signup request approved successfully.',
                    'user': UserSerializer(user).data
                },
                status=status.HTTP_200_OK
            )
    except Exception as e:
        return Response(
            {'detail': f'Failed to create user account: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reject_signup_request_view(request, request_id):
    """
    Reject a pending signup request
    POST /api/auth/signup-requests/:id/reject/
    
    Request body:
    {
        "rejection_reason": "string" (optional)
    }
    
    Returns:
    - 200: Signup request rejected successfully
    - 400: Invalid status transition
    - 403: User is not an admin
    - 404: Signup request not found
    """
    # Check if user is admin
    if not request.user.is_admin():
        return Response(
            {'detail': 'You do not have permission to perform this action.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        signup_request = SignupRequest.objects.get(id=request_id)
    except SignupRequest.DoesNotExist:
        return Response(
            {'detail': 'Signup request not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if request is pending
    if signup_request.status != 'pending':
        return Response(
            {'detail': 'Cannot reject a request that is not pending.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate rejection data
    serializer = RejectSignupRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Update signup request
    signup_request.status = 'rejected'
    signup_request.reviewed_by = request.user
    signup_request.reviewed_at = timezone.now()
    signup_request.rejection_reason = serializer.validated_data.get('rejection_reason', '')
    signup_request.save()
    
    return Response(
        {
            'message': 'Signup request rejected successfully.'
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_signup_request_status_view(request, username):
    """
    Check the status of a signup request by username or email
    GET /api/auth/signup-request-status/:username/
    
    Returns:
    - 200: Signup request status
    """
    try:
        # Try to find by username first, then by email
        from django.db.models import Q
        signup_request = SignupRequest.objects.filter(
            Q(username=username) | Q(email=username)
        ).first()
        
        if not signup_request:
            raise SignupRequest.DoesNotExist
            
        return Response(
            {
                'status': signup_request.status,
                'message': {
                    'pending': 'Your signup request is pending approval.',
                    'approved': 'Your signup request has been approved. You can now login.',
                    'rejected': 'Your signup request has been rejected.'
                }.get(signup_request.status, 'Unknown status'),
                'rejection_reason': signup_request.rejection_reason if signup_request.status == 'rejected' else None
            },
            status=status.HTTP_200_OK
        )
    except SignupRequest.DoesNotExist:
        return Response(
            {
                'status': 'not_found',
                'message': 'No signup request found for this username or email.'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        return Response(
            {
                'error': 'Failed to check signup request status',
                'details': str(e),
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
