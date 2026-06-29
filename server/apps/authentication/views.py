"""
Authentication Views
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import login, logout, get_user_model
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
from .models import SignupRequest, OTPToken
from .services import OTPService, EmailService
from django.utils import timezone
from django.db import transaction
from django.conf import settings

User = get_user_model()


def _detect_portal(request):
    """
    Determine which portal a login request targets: 'student', 'admin', or None.

    Prefers the explicit `portal` field sent by each client; falls back to an
    exact Origin/Referer match against the configured portal origins. Returning
    None means "no restriction" (backward compatible).
    """
    portal = (request.data.get('portal') or '').strip().lower()
    if portal in ('student', 'admin'):
        return portal

    origin = (request.META.get('HTTP_ORIGIN') or '').strip().lower()
    if not origin:
        referer = (request.META.get('HTTP_REFERER') or '').strip().lower()
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            if parsed.scheme and parsed.netloc:
                origin = f"{parsed.scheme}://{parsed.netloc}"

    if origin:
        student_origins = [o.lower() for o in getattr(settings, 'STUDENT_PORTAL_ORIGINS', [])]
        admin_origins = [o.lower() for o in getattr(settings, 'ADMIN_PORTAL_ORIGINS', [])]
        if origin in student_origins:
            return 'student'
        if origin in admin_origins:
            return 'admin'
    return None


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
                'details': str(e) if settings.DEBUG else None,
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_request_otp_view(request):
    """
    Step 1 of sign-up: validate the registration data and email a verification
    code. No account is created here — the user is only created at /register/
    once this code is verified.
    POST /api/auth/register/send-otp/

    Body: the same payload as /register/ (without `otp`).

    Returns:
    - 200: Verification code sent
    - 400: Validation error (e.g. username/email already taken, missing fields)
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data.get('email')
    if not email:
        return Response({'email': ['Email is required.']}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from .services import EmailVerificationService, EmailService
        code = EmailVerificationService.create_code(email)
        name = serializer.validated_data.get('first_name') or ''
        sent = EmailService.send_signup_otp_email(email, code.token, name)
        if not sent:
            return Response(
                {'error': 'Could not send the verification email. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(
            {'message': 'A verification code has been sent to your email.', 'email': email},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        import traceback
        return Response(
            {
                'error': 'Failed to send verification code',
                'details': str(e) if settings.DEBUG else None,
                'traceback': traceback.format_exc() if settings.DEBUG else None,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        # Email-verification gate: an account is created ONLY after the emailed
        # OTP (sent by /register/send-otp/) is verified.
        otp = (request.data.get('otp') or '').strip()
        if not otp:
            return Response(
                {'otp': ['Email verification code is required. Please verify your email to continue.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services import EmailVerificationService
        email = serializer.validated_data.get('email')
        valid, message = EmailVerificationService.verify_code(email, otp, consume=True)
        if not valid:
            return Response({'otp': [message]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()

            # Welcome email + in-app notification for new student/captain accounts.
            # (Teachers are welcomed on approval, not at signup.)
            if user.role in ['student', 'captain']:
                try:
                    from apps.notifications.dispatch import send_welcome_email
                    send_welcome_email(
                        user,
                        portal='student',
                        role_label='Class Captain' if user.role == 'captain' else 'Student',
                    )
                except Exception as notify_err:
                    import logging
                    logging.getLogger(__name__).error("Student welcome email failed: %s", notify_err)

            # Auto-login user after successful registration (except for teachers who need approval)
            auto_logged_in = False
            if user.role != 'teacher' and user.account_status == 'active':
                login(request, user)
                auto_logged_in = True

                # Set the default session expiry (7 days, sliding).
                request.session.set_expiry(settings.SESSION_COOKIE_AGE)
            
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
                    'details': str(e) if settings.DEBUG else None
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
        portal = _detect_portal(request)
        serializer = LoginSerializer(
            data=request.data, context={'request': request, 'portal': portal}
        )

        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Two-factor authentication: if enabled, defer the actual login
            # until the emailed OTP code is verified at /login/verify-2fa/.
            if getattr(user, 'two_factor_enabled', False):
                otp_token = OTPService.create_otp_token(user)
                EmailService.send_login_otp_email(user, otp_token.token)
                return Response(
                    {
                        'two_factor_required': True,
                        'email': user.email,
                        'message': 'A verification code has been sent to your email.',
                    },
                    status=status.HTTP_200_OK,
                )

            # Update last_login timestamp
            from django.utils import timezone
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            # Login user (creates session)
            login(request, user)

            # Handle "Remember Me" functionality.
            # With SESSION_SAVE_EVERY_REQUEST enabled, the chosen expiry acts as a
            # sliding window: it is refreshed on every request, so an active user
            # is never logged out and an idle session survives the full window.
            remember_me = request.data.get('remember_me', False)
            if remember_me:
                # "Remember Me": effectively indefinite (until explicit logout).
                request.session.set_expiry(settings.REMEMBER_ME_SESSION_AGE)
            else:
                # Normal session: the configured default (7 days).
                request.session.set_expiry(settings.SESSION_COOKIE_AGE)
            
            # Return user data
            user_serializer = UserSerializer(user, context={'request': request})

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
                'details': str(e) if settings.DEBUG else None,
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
        serializer = UserSerializer(request.user, context={'request': request})

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
                'details': str(e) if settings.DEBUG else None,
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
        "confirm_password": "string"
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
        # Verify old password
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Current password is incorrect']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_profile_view(request):
    """
    Update user profile
    PUT/PATCH /api/auth/profile/
    
    Request body:
    {
        "first_name": "string" (optional),
        "last_name": "string" (optional),
        "email": "string" (optional),
        "mobile_number": "string" (optional)
    }
    
    Returns:
    - 200: Profile updated successfully
    - 400: Validation error
    """
    user = request.user
    
    # Get data from request
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    email = request.data.get('email')
    mobile_number = request.data.get('mobile_number')
    interface_mode = request.data.get('interface_mode')
    department_id = request.data.get('department')

    # Update fields if provided
    if first_name is not None:
        user.first_name = first_name.strip()
    
    if last_name is not None:
        user.last_name = last_name.strip()
    
    if email is not None:
        email = email.strip().lower()
        # Check if email is already taken by another user
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return Response(
                {'email': ['This email is already in use']},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.email = email
    
    if mobile_number is not None:
        user.mobile_number = mobile_number.strip()

    if interface_mode is not None:
        valid_modes = [choice[0] for choice in User.INTERFACE_MODE_CHOICES]
        if interface_mode not in valid_modes:
            return Response(
                {'interface_mode': ['Must be either "simple" or "advanced".']},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.interface_mode = interface_mode

    # Department Heads can set/update the department they manage
    if department_id is not None and user.role == 'department_head':
        if department_id == '' or department_id is None:
            user.department = None
        else:
            from apps.departments.models import Department
            department = Department.objects.filter(id=department_id).first()
            if not department:
                return Response(
                    {'department': ['Invalid department selected.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.department = department

    try:
        user.save()
        serializer = UserSerializer(user)
        return Response(
            {
                'message': 'Profile updated successfully',
                'user': serializer.data
            },
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': 'Failed to update profile', 'details': str(e) if settings.DEBUG else None},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_avatar_view(request):
    """
    Upload / replace the current user's profile photo.
    POST /api/auth/profile/photo/  (multipart: profile_photo)
    """
    photo = (
        request.FILES.get('profile_photo')
        or request.FILES.get('photo')
        or request.FILES.get('avatar')
    )
    if not photo:
        return Response({'message': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)
    if photo.size > 5 * 1024 * 1024:
        return Response({'message': 'Image must be 5MB or smaller'}, status=status.HTTP_400_BAD_REQUEST)
    if not (photo.content_type or '').startswith('image/'):
        return Response({'message': 'File must be an image'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.profile_photo = photo
    user.save(update_fields=['profile_photo'])
    serializer = UserSerializer(user, context={'request': request})
    return Response(
        {'message': 'Profile photo updated', 'user': serializer.data},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_signature_view(request):
    """
    Upload / replace the current user's signature image (used on approved documents).
    POST /api/auth/profile/signature/  (multipart: signature)
    """
    sig = request.FILES.get('signature') or request.FILES.get('image')
    if not sig:
        return Response({'message': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)
    if sig.size > 5 * 1024 * 1024:
        return Response({'message': 'Image must be 5MB or smaller'}, status=status.HTTP_400_BAD_REQUEST)
    if not (sig.content_type or '').startswith('image/'):
        return Response({'message': 'File must be an image'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.signature = sig
    user.save(update_fields=['signature'])
    serializer = UserSerializer(user, context={'request': request})
    return Response(
        {'message': 'Signature updated', 'user': serializer.data},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_2fa_view(request):
    """
    Enable or disable email-based two-factor authentication for the current user.
    POST /api/auth/2fa/toggle/  body: {"enabled": true|false}
    """
    enabled = request.data.get('enabled')
    if enabled is None:
        enabled = not request.user.two_factor_enabled
    enabled = bool(enabled)

    user = request.user
    user.two_factor_enabled = enabled
    user.save(update_fields=['two_factor_enabled'])
    return Response(
        {
            'message': f'Two-factor authentication {"enabled" if enabled else "disabled"}.',
            'two_factor_enabled': enabled,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def revoke_other_sessions_view(request):
    """
    Sign out all of the current user's sessions except the one making this request.
    POST /api/auth/sessions/revoke-others/
    """
    from django.contrib.sessions.models import Session

    current_key = request.session.session_key
    user_id = str(request.user.pk)
    deleted = 0
    for session in Session.objects.filter(expire_date__gte=timezone.now()):
        if session.session_key == current_key:
            continue
        if str(session.get_decoded().get('_auth_user_id')) == user_id:
            session.delete()
            deleted += 1
    return Response(
        {'message': f'Signed out {deleted} other session(s).', 'count': deleted},
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_login_2fa_view(request):
    """
    Complete a two-factor login by verifying the emailed OTP code.
    POST /api/auth/login/verify-2fa/  body: {"email", "otp", "remember_me"}
    """
    email = (request.data.get('email') or '').strip()
    otp = (request.data.get('otp') or '').strip()
    remember_me = bool(request.data.get('remember_me', False))

    if not email or not otp:
        return Response({'message': 'Email and verification code are required.'}, status=status.HTTP_400_BAD_REQUEST)

    valid, message = OTPService.verify_otp(email, otp)
    if not valid:
        return Response({'message': message}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve the account the (still-unused) OTP belongs to, then consume it.
    token_obj = OTPToken.objects.filter(
        user__email__iexact=email, token=otp, is_used=False
    ).order_by('-created_at').first()
    user = token_obj.user if token_obj else None
    if user is None:
        return Response({'message': 'Invalid verification attempt.'}, status=status.HTTP_400_BAD_REQUEST)

    # Enforce portal access (same rule as the password login path) so an admin
    # cannot complete a 2FA login on the student portal, and vice-versa.
    portal = _detect_portal(request)
    if portal in ('student', 'admin'):
        from .serializers import user_allowed_for_portal, PORTAL_DENIED_MESSAGE
        if not user_allowed_for_portal(user, portal):
            return Response({'message': PORTAL_DENIED_MESSAGE[portal]}, status=status.HTTP_400_BAD_REQUEST)

    OTPService.mark_otp_as_used(email, otp)

    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    login(request, user)
    request.session.set_expiry(
        settings.REMEMBER_ME_SESSION_AGE if remember_me else settings.SESSION_COOKIE_AGE
    )

    user_serializer = UserSerializer(user, context={'request': request})
    return Response(
        {'message': 'Login successful', 'user': user_serializer.data, 'remember_me': remember_me},
        status=status.HTTP_200_OK,
    )


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
        "requested_role": "registrar|department_head|institute_head",
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

            # Notify the Principal about the new admin signup request
            try:
                from apps.notifications.dispatch import notify_admin_signup_request
                notify_admin_signup_request(signup_request)
            except Exception as notify_err:
                import logging
                logging.getLogger(__name__).error("Signup request notification failed: %s", notify_err)

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
                'details': str(e) if settings.DEBUG else None,
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
                department=signup_request.department,  # for Department Head accounts
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

            # Send a professional welcome email + in-app notification
            try:
                from apps.notifications.dispatch import send_welcome_email
                role_labels = {
                    'registrar': 'Registrar',
                    'department_head': 'Department Head',
                    'institute_head': 'Principal',
                }
                extra = []
                if user.department:
                    extra.append({'label': 'Department', 'value': user.department.name})
                extra.append({'label': 'Username', 'value': user.username})
                send_welcome_email(
                    user,
                    portal='admin',
                    role_label=role_labels.get(user.role, user.role),
                    details=extra,
                )
            except Exception as notify_err:
                import logging
                logging.getLogger(__name__).error("Welcome email failed: %s", notify_err)

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

    # Inform the applicant by email that their request was declined
    try:
        from apps.notifications.email_service import send_branded_email
        reason = signup_request.rejection_reason
        body_lines = [
            "After review, we are unable to approve your admin account request at this time."
        ]
        if reason:
            body_lines.append(f"Reason: {reason}")
        body_lines.append("If you believe this is a mistake, please contact the institute administration.")
        send_branded_email(
            "Your SIPI Admin Signup Request",
            signup_request.email,
            heading="Signup Request Update",
            greeting=f"Hello {signup_request.first_name or signup_request.username},",
            body_lines=body_lines,
            accent_label="Not Approved",
            accent_color="#dc2626",
            accent_soft="#fef2f2",
        )
    except Exception as notify_err:
        import logging
        logging.getLogger(__name__).error("Rejection email failed: %s", notify_err)

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
                'details': str(e) if settings.DEBUG else None,
                'traceback': traceback.format_exc() if settings.DEBUG else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
