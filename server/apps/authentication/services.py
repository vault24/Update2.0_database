import secrets
import string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils.html import strip_tags
import logging
from .models import OTPToken, PasswordResetAttempt
User = get_user_model()
logger = logging.getLogger(__name__)
class EmailService:
    @staticmethod
    def send_otp_email(user, otp):
        try:
            subject = 'Password Reset OTP - SIPI Management System'
            html_message = f'''
            <h2>Password Reset OTP</h2>
            <p>Hello {user.first_name or user.username},</p>
            <p>Your OTP code is: <strong>{otp}</strong></p>
            <p>This code expires in 10 minutes.</p>
            '''
            return send_mail(subject, strip_tags(html_message), settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)
        except Exception as e:
            logger.error(f"Error sending OTP email: {e}")
            return False
    @staticmethod
    def send_password_reset_confirmation(user):
        try:
            subject = 'Password Reset Successful - SIPI Management System'
            html_message = f'<h2>Password Reset Successful</h2><p>Hello {user.first_name or user.username}, your password has been reset successfully.</p>'
            return send_mail(subject, strip_tags(html_message), settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)
        except Exception as e:
            logger.error(f"Error sending confirmation email: {e}")
            return False
class OTPService:
    @staticmethod
    def generate_otp():
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    @staticmethod
    def create_otp_token(user):
        OTPService.invalidate_user_otps(user)
        otp = OTPService.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=getattr(settings, 'OTP_EXPIRY_MINUTES', 10))
        return OTPToken.objects.create(user=user, token=otp, expires_at=expires_at, max_attempts=getattr(settings, 'OTP_MAX_ATTEMPTS', 3))
    @staticmethod
    def verify_otp(email, token):
        try:
            user = User.objects.get(email=email)
            otp_token = OTPToken.objects.filter(user=user, token=token, is_used=False).order_by('-created_at').first()
            if not otp_token:
                return False, "Invalid OTP code"
            if otp_token.is_expired():
                return False, "OTP has expired"
            if otp_token.attempts >= otp_token.max_attempts:
                return False, "Maximum verification attempts exceeded"
            otp_token.increment_attempts()
            if otp_token.is_valid():
                return True, "OTP verified successfully"
            else:
                return False, "Invalid OTP code"
        except User.DoesNotExist:
            return False, "Invalid OTP code"
    @staticmethod
    def invalidate_user_otps(user):
        OTPToken.objects.filter(user=user, is_used=False).update(is_used=True)
    @staticmethod
    def mark_otp_as_used(email, token):
        try:
            user = User.objects.get(email=email)
            otp_token = OTPToken.objects.filter(user=user, token=token, is_used=False).order_by('-created_at').first()
            if otp_token:
                otp_token.mark_as_used()
                return True
        except User.DoesNotExist:
            pass
        return False
class RateLimitService:
    @staticmethod
    def is_rate_limited(email, ip_address=None):
        max_attempts = getattr(settings, 'PASSWORD_RESET_RATE_LIMIT_PER_HOUR', 3)
        email_limited = PasswordResetAttempt.is_rate_limited(email, max_attempts=max_attempts, hours=1)
        ip_limited = False
        if ip_address:
            since = timezone.now() - timedelta(hours=1)
            ip_attempts = PasswordResetAttempt.objects.filter(ip_address=ip_address, created_at__gte=since).count()
            ip_limited = ip_attempts >= max_attempts * 2
        return email_limited or ip_limited
    @staticmethod
    def record_attempt(email, ip_address, success=False, user_agent=''):
        PasswordResetAttempt.objects.create(email=email, ip_address=ip_address, success=success, user_agent=user_agent)
    @staticmethod
    def get_remaining_attempts(email):
        max_attempts = getattr(settings, 'PASSWORD_RESET_RATE_LIMIT_PER_HOUR', 3)
        recent_attempts = PasswordResetAttempt.get_recent_attempts(email, hours=1)
        return max(0, max_attempts - recent_attempts)
class SecurityService:
    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    @staticmethod
    def get_user_agent(request):
        return request.META.get('HTTP_USER_AGENT', '')
