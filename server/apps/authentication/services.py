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


def get_user_by_email(email, roles=None):
    """
    Resilient user lookup by email.

    The User table does not enforce unique emails, so `User.objects.get(email=...)`
    can raise MultipleObjectsReturned (e.g. the same person has a student *and* an
    admin account). This returns a single best-match user (optionally scoped to
    the given roles) and raises User.DoesNotExist when there is no match — so
    callers using `except User.DoesNotExist` keep working.
    """
    qs = User.objects.filter(email__iexact=(email or '').strip())
    if roles:
        scoped = qs.filter(role__in=roles)
        if scoped.exists():
            qs = scoped
    user = qs.order_by('-is_active', '-last_login', '-date_joined').first()
    if user is None:
        raise User.DoesNotExist
    return user


# Roles used to disambiguate password-reset lookups per portal.
STUDENT_RESET_ROLES = ['student', 'captain']
ADMIN_RESET_ROLES = ['registrar', 'department_head', 'institute_head', 'teacher']


class EmailService:
    @staticmethod
    def send_otp_email(user, otp):
        """Send a branded password-reset OTP email (works for both portals)."""
        try:
            from apps.notifications.email_service import send_branded_email
            expiry = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
            return send_branded_email(
                'Password Reset Code - SIPI',
                user.email,
                heading='Your Password Reset Code',
                greeting=f"Hello {user.first_name or user.username},",
                intro='Use the verification code below to reset your password.',
                highlight=otp,
                body_lines=[
                    f'This code will expire in {expiry} minutes.',
                    "If you didn't request a password reset, you can safely ignore this email.",
                ],
                accent_label='Security',
                accent_color='#d97706',
                accent_soft='#fffbeb',
                async_send=False,  # password reset should confirm delivery synchronously
            )
        except Exception as e:
            logger.error(f"Error sending OTP email: {e}")
            return False

    @staticmethod
    def send_login_otp_email(user, otp):
        """Send a branded two-factor LOGIN verification code (not a password reset)."""
        try:
            from apps.notifications.email_service import send_branded_email
            expiry = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
            return send_branded_email(
                'Your Login Verification Code - SIPI',
                user.email,
                heading='Your Login Verification Code',
                greeting=f"Hello {user.first_name or user.username},",
                intro='Use the verification code below to finish signing in to your account.',
                highlight=otp,
                body_lines=[
                    f'This code will expire in {expiry} minutes.',
                    "If you didn't try to sign in, please change your password immediately.",
                ],
                accent_label='Security',
                accent_color='#2563eb',
                accent_soft='#eff6ff',
                async_send=False,  # login should confirm delivery synchronously
            )
        except Exception as e:
            logger.error(f"Error sending login OTP email: {e}")
            return False

    @staticmethod
    def send_password_reset_confirmation(user):
        """Confirm a successful password reset (security notification)."""
        try:
            from apps.notifications.email_service import send_branded_email
            return send_branded_email(
                'Password Reset Successful - SIPI',
                user.email,
                heading='Password Reset Successful',
                greeting=f"Hello {user.first_name or user.username},",
                intro='Your password has been reset successfully. You can now sign in with your new password.',
                body_lines=[
                    "If you did not perform this change, please contact the administration immediately.",
                ],
                accent_label='Security',
                accent_color='#16a34a',
                accent_soft='#ecfdf5',
            )
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
        """
        Validate an OTP against the user's latest unused token.

        Only *failed* attempts are counted toward the attempt limit (so a correct
        code can be checked at the verify step and again at the confirm step
        without locking the user out). Brute-force protection is preserved because
        each wrong guess increments the counter on the latest token.
        """
        try:
            # Look up the token by the owner's email directly. This avoids
            # User.objects.get() (which can fail when an email is shared) and
            # naturally picks the most recent reset request for that email.
            otp_token = OTPToken.objects.filter(
                user__email__iexact=(email or '').strip(), is_used=False
            ).order_by('-created_at').first()
            if not otp_token:
                return False, "Invalid OTP code"
            if otp_token.is_expired():
                return False, "OTP has expired"
            if otp_token.attempts >= otp_token.max_attempts:
                return False, "Maximum verification attempts exceeded"
            if otp_token.token != str(token).strip():
                # Wrong code: count this as a failed attempt
                otp_token.increment_attempts()
                return False, "Invalid OTP code"
            return True, "OTP verified successfully"
        except User.DoesNotExist:
            return False, "Invalid OTP code"
    @staticmethod
    def invalidate_user_otps(user):
        OTPToken.objects.filter(user=user, is_used=False).update(is_used=True)
    @staticmethod
    def mark_otp_as_used(email, token):
        otp_token = OTPToken.objects.filter(
            user__email__iexact=(email or '').strip(),
            token=str(token).strip(),
            is_used=False,
        ).order_by('-created_at').first()
        if otp_token:
            otp_token.mark_as_used()
            return True
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
