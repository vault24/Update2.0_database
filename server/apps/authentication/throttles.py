"""
Rate-limit throttles for sensitive, mostly-anonymous auth endpoints.

These guard against password brute-forcing and OTP/email-verification abuse
(email bombing). Rates are configured in settings.REST_FRAMEWORK
['DEFAULT_THROTTLE_RATES'] and are disabled automatically under the test runner
so the suite is not rate-limited (the dedicated throttle test re-enables them).

NOTE: the default cache backend is per-process LocMemCache, so with multiple
web workers each worker keeps its own counter. For strict global limits in
production, point Django's CACHES at the shared Redis instance.
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Throttle password login / 2FA / Google attempts (per client IP)."""
    scope = 'login'


class OTPSendRateThrottle(AnonRateThrottle):
    """Throttle endpoints that email an OTP / verification code (per client IP)."""
    scope = 'otp'
