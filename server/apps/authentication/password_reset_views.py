"""
Password Reset Views
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .serializers import (
    PasswordResetRequestSerializer,
    OTPVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetResponseSerializer,
    OTPVerificationResponseSerializer,
    PasswordResetConfirmResponseSerializer
)
from .services import OTPService, EmailService, RateLimitService, SecurityService

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def student_password_reset_request(request):
    """
    Request password reset for student users
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Please provide a valid email address',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    ip_address = SecurityService.get_client_ip(request)
    user_agent = SecurityService.get_user_agent(request)
    
    # Check rate limiting
    if RateLimitService.is_rate_limited(email, ip_address):
        remaining = RateLimitService.get_remaining_attempts(email)
        RateLimitService.record_attempt(email, ip_address, success=False, user_agent=user_agent)
        
        return Response({
            'success': False,
            'message': 'Too many password reset attempts. Please try again later.',
            'remaining_attempts': remaining
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    try:
        # Check if user exists and is a student
        user = User.objects.get(email=email)
        
        if not user.is_student_or_captain():
            # Log security event but return generic message
            logger.warning(f"Password reset attempted for non-student user: {email} from {ip_address}")
            RateLimitService.record_attempt(email, ip_address, success=False, user_agent=user_agent)
            
            # Return generic success message for security
            return Response({
                'success': True,
                'message': 'If your email is registered, you will receive an OTP shortly.'
            }, status=status.HTTP_200_OK)
        
        # Generate and send OTP
        otp_token = OTPService.create_otp_token(user)
        email_sent = EmailService.send_otp_email(user, otp_token.token)
        
        if email_sent:
            RateLimitService.record_attempt(email, ip_address, success=True, user_agent=user_agent)
            logger.info(f"Password reset OTP sent to student: {email}")
            
            return Response({
                'success': True,
                'message': 'If your email is registered, you will receive an OTP shortly.'
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"Failed to send OTP email to: {email}")
            return Response({
                'success': False,
                'message': 'Unable to send email at this time. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except User.DoesNotExist:
        # Log attempt but return generic message for security
        logger.info(f"Password reset attempted for non-existent email: {email} from {ip_address}")
        RateLimitService.record_attempt(email, ip_address, success=False, user_agent=user_agent)
        
        # Return generic success message for security
        return Response({
            'success': True,
            'message': 'If your email is registered, you will receive an OTP shortly.'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in student password reset request: {str(e)}")
        return Response({
            'success': False,
            'message': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def student_otp_verification(request):
    """
    Verify OTP for student password reset
    """
    serializer = OTPVerificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Please provide valid email and OTP',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    otp = serializer.validated_data['otp']
    ip_address = SecurityService.get_client_ip(request)
    
    try:
        # Verify user exists and is a student
        user = User.objects.get(email=email)
        
        if not user.is_student_or_captain():
            logger.warning(f"OTP verification attempted for non-student user: {email} from {ip_address}")
            return Response({
                'success': False,
                'message': 'Invalid OTP code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP
        is_valid, message = OTPService.verify_otp(email, otp)
        
        if is_valid:
            logger.info(f"OTP verified successfully for student: {email}")
            return Response({
                'success': True,
                'message': message,
                'verified': True
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"Invalid OTP attempt for student: {email} from {ip_address}")
            return Response({
                'success': False,
                'message': message,
                'verified': False
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except User.DoesNotExist:
        logger.warning(f"OTP verification attempted for non-existent email: {email} from {ip_address}")
        return Response({
            'success': False,
            'message': 'Invalid OTP code'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"Error in student OTP verification: {str(e)}")
        return Response({
            'success': False,
            'message': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def student_password_reset_confirm(request):
    """
    Confirm password reset for student users
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Please provide valid data',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    otp = serializer.validated_data['otp']
    new_password = serializer.validated_data['new_password']
    ip_address = SecurityService.get_client_ip(request)
    
    try:
        # Verify user exists and is a student
        user = User.objects.get(email=email)
        
        if not user.is_student_or_captain():
            logger.warning(f"Password reset confirmation attempted for non-student user: {email} from {ip_address}")
            return Response({
                'success': False,
                'message': 'Invalid request'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP one more time
        is_valid, message = OTPService.verify_otp(email, otp)
        
        if not is_valid:
            logger.warning(f"Invalid OTP in password reset confirmation for student: {email}")
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        user.password = make_password(new_password)
        user.save(update_fields=['password'])
        
        # Mark OTP as used
        OTPService.mark_otp_as_used(email, otp)
        
        # Send confirmation email
        EmailService.send_password_reset_confirmation(user)
        
        logger.info(f"Password reset completed successfully for student: {email}")
        
        return Response({
            'success': True,
            'message': 'Password reset successful. You can now log in with your new password.',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role
            }
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        logger.warning(f"Password reset confirmation attempted for non-existent email: {email} from {ip_address}")
        return Response({
            'success': False,
            'message': 'Invalid request'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"Error in student password reset confirmation: {str(e)}")
        return Response({
            'success': False,
            'message': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin Password Reset Views

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_password_reset_request(request):
    """
    Request password reset for admin users
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Please provide a valid email address',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    ip_address = SecurityService.get_client_ip(request)
    user_agent = SecurityService.get_user_agent(request)
    
    # Check rate limiting
    if RateLimitService.is_rate_limited(email, ip_address):
        remaining = RateLimitService.get_remaining_attempts(email)
        RateLimitService.record_attempt(email, ip_address, success=False, user_agent=user_agent)
        
        return Response({
            'success': False,
            'message': 'Too many password reset attempts. Please try again later.',
            'remaining_attempts': remaining
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    try:
        # Check if user exists and is an admin
        user = User.objects.get(email=email)
        
        if not user.is_admin() and not user.is_teacher():
            # Log security event but return generic message
            logger.warning(f"Admin password reset attempted for non-admin user: {email} from {ip_address}")
            RateLimitService.record_attempt(email, ip_address, success=False, user_agent=user_agent)
            
            # Return generic success message for security
            return Response({
                'success': True,
                'message': 'If your email is registered, you will receive an OTP shortly.'
            }, status=status.HTTP_200_OK)
        
        # Generate and send OTP
        otp_token = OTPService.create_otp_token(user)
        email_sent = EmailService.send_otp_email(user, otp_token.token)
        
        if email_sent:
            RateLimitService.record_attempt(email, ip_address, success=True, user_agent=user_agent)
            logger.info(f"Password reset OTP sent to admin: {email}")
            
            return Response({
                'success': True,
                'message': 'If your email is registered, you will receive an OTP shortly.'
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"Failed to send OTP email to admin: {email}")
            return Response({
                'success': False,
                'message': 'Unable to send email at this time. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except User.DoesNotExist:
        # Log attempt but return generic message for security
        logger.info(f"Admin password reset attempted for non-existent email: {email} from {ip_address}")
        RateLimitService.record_attempt(email, ip_address, success=False, user_agent=user_agent)
        
        # Return generic success message for security
        return Response({
            'success': True,
            'message': 'If your email is registered, you will receive an OTP shortly.'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in admin password reset request: {str(e)}")
        return Response({
            'success': False,
            'message': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_otp_verification(request):
    """
    Verify OTP for admin password reset
    """
    serializer = OTPVerificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Please provide valid email and OTP',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    otp = serializer.validated_data['otp']
    ip_address = SecurityService.get_client_ip(request)
    
    try:
        # Verify user exists and is an admin
        user = User.objects.get(email=email)
        
        if not user.is_admin() and not user.is_teacher():
            logger.warning(f"Admin OTP verification attempted for non-admin user: {email} from {ip_address}")
            return Response({
                'success': False,
                'message': 'Invalid OTP code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP
        is_valid, message = OTPService.verify_otp(email, otp)
        
        if is_valid:
            logger.info(f"OTP verified successfully for admin: {email}")
            return Response({
                'success': True,
                'message': message,
                'verified': True
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"Invalid OTP attempt for admin: {email} from {ip_address}")
            return Response({
                'success': False,
                'message': message,
                'verified': False
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except User.DoesNotExist:
        logger.warning(f"Admin OTP verification attempted for non-existent email: {email} from {ip_address}")
        return Response({
            'success': False,
            'message': 'Invalid OTP code'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"Error in admin OTP verification: {str(e)}")
        return Response({
            'success': False,
            'message': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_password_reset_confirm(request):
    """
    Confirm password reset for admin users
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Please provide valid data',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    otp = serializer.validated_data['otp']
    new_password = serializer.validated_data['new_password']
    ip_address = SecurityService.get_client_ip(request)
    
    try:
        # Verify user exists and is an admin
        user = User.objects.get(email=email)
        
        if not user.is_admin() and not user.is_teacher():
            logger.warning(f"Admin password reset confirmation attempted for non-admin user: {email} from {ip_address}")
            return Response({
                'success': False,
                'message': 'Invalid request'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP one more time
        is_valid, message = OTPService.verify_otp(email, otp)
        
        if not is_valid:
            logger.warning(f"Invalid OTP in admin password reset confirmation: {email}")
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        user.password = make_password(new_password)
        user.save(update_fields=['password'])
        
        # Mark OTP as used
        OTPService.mark_otp_as_used(email, otp)
        
        # Send confirmation email
        EmailService.send_password_reset_confirmation(user)
        
        logger.info(f"Password reset completed successfully for admin: {email}")
        
        return Response({
            'success': True,
            'message': 'Password reset successful. You can now log in with your new password.',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role
            }
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        logger.warning(f"Admin password reset confirmation attempted for non-existent email: {email} from {ip_address}")
        return Response({
            'success': False,
            'message': 'Invalid request'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        logger.error(f"Error in admin password reset confirmation: {str(e)}")
        return Response({
            'success': False,
            'message': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)