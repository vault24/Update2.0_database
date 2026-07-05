import secrets
import string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils.html import strip_tags
import logging
from .models import OTPToken, PasswordResetAttempt, EmailVerificationCode
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
                category='security',  # OTP emails are always sent
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
                category='security',  # OTP emails are always sent
            )
        except Exception as e:
            logger.error(f"Error sending login OTP email: {e}")
            return False

    @staticmethod
    def send_signup_otp_email(email, otp, name=None):
        """Send a branded sign-up email verification code (before the account exists)."""
        try:
            from apps.notifications.email_service import send_branded_email
            expiry = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
            return send_branded_email(
                'Verify Your Email - SIPI',
                email,
                heading='Verify Your Email',
                greeting=f"Hello {name or 'there'},",
                intro='Use the verification code below to complete your sign up. Your account is created only after this code is verified.',
                highlight=otp,
                body_lines=[
                    f'This code will expire in {expiry} minutes.',
                    "If you didn't try to sign up, you can safely ignore this email.",
                ],
                accent_label='Security',
                accent_color='#2563eb',
                accent_soft='#eff6ff',
                async_send=False,  # signup should confirm delivery synchronously
                category='security',  # OTP emails are always sent
            )
        except Exception as e:
            logger.error(f"Error sending signup OTP email: {e}")
            return False

    @staticmethod
    def send_account_action_otp_email(user, otp, action_label='confirm this account change'):
        """Send a branded OTP for sensitive account actions (switch / delete)."""
        try:
            from apps.notifications.email_service import send_branded_email
            expiry = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
            return send_branded_email(
                'Account Verification Code - SIPI',
                user.email,
                heading='Your Account Verification Code',
                greeting=f"Hello {user.first_name or user.username},",
                intro=f'Use the verification code below to {action_label}.',
                highlight=otp,
                body_lines=[
                    f'This code will expire in {expiry} minutes.',
                    "If you didn't request this change, please change your password immediately.",
                ],
                accent_label='Security',
                accent_color='#dc2626',
                accent_soft='#fef2f2',
                async_send=False,  # the user is waiting on this code
                category='security',  # OTP emails are always sent
            )
        except Exception as e:
            logger.error(f"Error sending account action OTP email: {e}")
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
                category='security',  # security confirmations are always sent
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


class EmailVerificationService:
    """
    OTP verification for pre-account actions (sign-up). Codes are keyed by
    email + purpose because no User exists yet.
    """

    @staticmethod
    def create_code(email, purpose=EmailVerificationCode.PURPOSE_SIGNUP):
        email = (email or '').strip().lower()
        # Invalidate any previous unused code for this email + purpose.
        EmailVerificationCode.objects.filter(
            email__iexact=email, purpose=purpose, is_used=False
        ).update(is_used=True)
        code = OTPService.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=getattr(settings, 'OTP_EXPIRY_MINUTES', 10))
        return EmailVerificationCode.objects.create(
            email=email,
            token=code,
            purpose=purpose,
            expires_at=expires_at,
            max_attempts=getattr(settings, 'OTP_MAX_ATTEMPTS', 3) + 2,
        )

    @staticmethod
    def verify_code(email, token, purpose=EmailVerificationCode.PURPOSE_SIGNUP, consume=False):
        """
        Validate a code against the email's latest unused code.
        Pass consume=True to mark it used on success (do this only at the final
        account-creation step). Wrong guesses count toward the attempt limit.
        """
        obj = EmailVerificationCode.objects.filter(
            email__iexact=(email or '').strip().lower(), purpose=purpose, is_used=False
        ).order_by('-created_at').first()
        if not obj:
            return False, "Invalid or expired verification code. Please request a new one."
        if obj.is_expired():
            return False, "Verification code has expired. Please request a new one."
        if obj.attempts >= obj.max_attempts:
            return False, "Maximum verification attempts exceeded. Please request a new code."
        if obj.token != str(token).strip():
            obj.increment_attempts()
            return False, "Invalid verification code."
        if consume:
            obj.mark_as_used()
        return True, "Verified successfully."
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


class GoogleAuthError(Exception):
    """Raised when a Google access token cannot be verified."""


class GoogleAuthService:
    """
    Verifies the OAuth 2.0 access token produced by the "Continue with Google"
    button on the student portal, using only the Python standard library (no
    extra dependency).

    Two Google endpoints are consulted:
      1. tokeninfo  — confirms the token's audience (`aud`) is OUR client ID.
        This is the critical check that stops an access token minted for some
        other app from being replayed here (the "token substitution" attack).
      2. userinfo   — returns the verified email and the person's name, which we
        use to log in an existing account or pre-fill the signup form.
    """

    TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
    USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
    _TIMEOUT = 10  # seconds

    @staticmethod
    def _get_json(url, headers=None):
        import json
        import urllib.request
        import urllib.error

        req = urllib.request.Request(url, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=GoogleAuthService._TIMEOUT) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            raise GoogleAuthError('Google rejected the sign-in token.') from exc
        except Exception as exc:  # network / timeout / parse
            logger.warning("Google token verification request failed: %s", exc)
            raise GoogleAuthError('Could not reach Google to verify your sign-in.') from exc

    @staticmethod
    def verify_access_token(access_token):
        """
        Verify a Google access token and return the person's identity.

        Returns a dict: {email, email_verified, name, first_name, last_name}.
        Raises GoogleAuthError on any problem (mis-configuration, wrong audience,
        unverified email, network failure, invalid token).
        """
        client_id = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '') or '').strip()
        if not client_id:
            raise GoogleAuthError('Google sign-in is not configured on the server.')

        access_token = (access_token or '').strip()
        if not access_token:
            raise GoogleAuthError('Missing Google sign-in token.')

        from urllib.parse import urlencode

        # 1) Audience check — the token MUST have been issued for this app.
        info = GoogleAuthService._get_json(
            f"{GoogleAuthService.TOKENINFO_URL}?{urlencode({'access_token': access_token})}"
        )
        audience = info.get('aud') or info.get('azp')
        if audience != client_id:
            logger.warning("Google token audience mismatch (got %r).", audience)
            raise GoogleAuthError('This Google sign-in was not issued for this application.')

        # 2) Profile — verified email + name.
        profile = GoogleAuthService._get_json(
            GoogleAuthService.USERINFO_URL,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        email = (profile.get('email') or '').strip().lower()
        if not email:
            raise GoogleAuthError('Your Google account did not share an email address.')

        # userinfo returns a real boolean; tokeninfo returns the string 'true'.
        email_verified = profile.get('email_verified')
        if email_verified in (False, 'false'):
            raise GoogleAuthError('Your Google email address is not verified.')

        return {
            'email': email,
            'email_verified': True,
            'name': (profile.get('name') or '').strip(),
            'first_name': (profile.get('given_name') or '').strip(),
            'last_name': (profile.get('family_name') or '').strip(),
        }
