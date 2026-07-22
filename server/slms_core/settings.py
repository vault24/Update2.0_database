"""
Django settings for slms_core project.
"""

from pathlib import Path
from decouple import config, Csv
import sys

# --------------------------------------------------
# BASE
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-#bwr-tx#5=jeo0s)nf2x2%8ecj7^_=)$)f)j@=l!ja2_dyc!#'
)

# Secure by default: DEBUG is OFF unless explicitly enabled in the environment.
# Local development sets DEBUG=True in server/.env; production never should.
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    # Dev-only default; production hosts come from the .env (no hardcoded hosts).
    default='localhost,127.0.0.1,testserver',
    cast=Csv()
)

# --------------------------------------------------
# APPLICATIONS
# --------------------------------------------------
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'channels',

    # Local apps
    'apps.authentication',
    'apps.admissions',
    'apps.departments',
    'apps.students',
    'apps.alumni',
    'apps.applications',
    'apps.documents',
    'apps.dashboard',
    'apps.notifications',
    'apps.notices',
    'apps.teachers',
    'apps.teacher_requests',
    'apps.class_routines',
    'apps.attendance',
    'apps.marks',
    'apps.correction_requests',
    'apps.activity_logs',
    'apps.system_settings',
    'apps.motivations',
    'apps.stipends',
    'apps.complaints',
    'apps.system_reports',
    'apps.results',
    'apps.website',
]

# --------------------------------------------------
# MIDDLEWARE
# --------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Per-portal session cookies: the admin SPA (X-Portal: admin) gets its own
    # session cookie so student + admin logins coexist in one browser.
    'apps.authentication.portal_sessions.PortalSessionMiddleware',

    # CORS MUST BE BEFORE CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    'apps.authentication.middleware.RoleBasedAccessMiddleware',
    'apps.activity_logs.middleware.ActivityLogMiddleware',
    'apps.system_reports.middleware.SystemReportMiddleware',
]

# --------------------------------------------------
# URL / TEMPLATE
# --------------------------------------------------
ROOT_URLCONF = 'slms_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'slms_core.wsgi.application'
ASGI_APPLICATION = 'slms_core.asgi.application'

# --------------------------------------------------
# CHANNELS (REDIS)
# --------------------------------------------------
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(config('REDIS_HOST', default='127.0.0.1'),
                       config('REDIS_PORT', default=6379, cast=int))],
        },
    },
}

# --------------------------------------------------
# DATABASE
# --------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='sipi_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

if 'test' in sys.argv:
    DATABASES['default']['NAME'] = 'test_sipi_db'

# --------------------------------------------------
# AUTH / PASSWORD
# --------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'authentication.User'

# --------------------------------------------------
# I18N
# --------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --------------------------------------------------
# STATIC / MEDIA
# --------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# --------------------------------------------------
# FILE STORAGE CONFIGURATION
# --------------------------------------------------
# File storage settings for document management
FILE_STORAGE_ROOT = BASE_DIR / 'storage'
FILE_STORAGE_URL = '/files/'

# Maximum file sizes (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB default
MAX_FILE_SIZES = {
    'image': 5 * 1024 * 1024,      # 5MB for images
    'document': 10 * 1024 * 1024,   # 10MB for documents
    'video': 50 * 1024 * 1024,      # 50MB for videos
}

# Allowed file types
ALLOWED_FILE_TYPES = {
    'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    'document': ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    'archive': ['zip', 'rar', '7z'],
    'spreadsheet': ['xls', 'xlsx', 'csv'],
    'presentation': ['ppt', 'pptx'],
}

# File storage organization
FILE_STORAGE_STRUCTURE = {
    'documents': 'documents/{year}/{month}/',
    'images': 'images/{year}/{month}/',
    'temp': 'temp/',
    'archives': 'archives/{year}/',
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --------------------------------------------------
# DRF
# --------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'slms_core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    # SECURITY: deny-by-default. Every endpoint requires an authenticated user
    # unless it explicitly opts out with `permission_classes = [AllowAny]`
    # (login, registration, password reset, public settings/department list,
    # public application submission/tracking). Historically DRF's implicit
    # default was AllowAny, which — combined with the RBAC middleware passing
    # unauthenticated requests straight through — left viewsets that omitted
    # `permission_classes` (students, teachers, admissions, etc.) open to the
    # public internet. This makes authentication the baseline for the whole API.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Cookie-session SPA: only session auth is used. BasicAuth is intentionally
    # excluded so credentials are never accepted from an Authorization header.
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    # Rate limits for sensitive auth endpoints (applied per-view, not globally).
    # 'login' guards password brute-force; 'otp' guards OTP/verification-email
    # abuse (email bombing). See apps.authentication.throttles.
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/min',
        'otp': '5/min',
        # Public result search (apps.results) — anonymous, so rate-limited.
        'result_search': '30/min',
        # Public result-card PDF download — heavier than a search, so tighter.
        'result_download': '10/min',
        # Public website (apps.website) — all anonymous. Reads are cached and
        # cheap so the general bucket is generous; search fans out across
        # several models so it gets its own tighter bucket.
        'website_read': '120/min',
        'website_search': '30/min',
    },
    # Production serves JSON only. DRF's interactive Browsable API (the HTML
    # interface at ?format=api, plus its write forms) exposes the whole API
    # surface to anyone and is a development convenience — it is re-enabled
    # ONLY under DEBUG below.
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# Behind the reverse proxy every request's REMOTE_ADDR is nginx (127.0.0.1),
# which would collapse all anonymous throttling into a single shared bucket.
# NUM_PROXIES=1 makes DRF read the real client IP that nginx appends to
# X-Forwarded-For, so login/OTP throttles are per-client again.
if config('USE_X_FORWARDED_PROTO', default=False, cast=bool):
    REST_FRAMEWORK['NUM_PROXIES'] = 1

# Disable throttling under the test runner so the suite is not rate-limited.
# The dedicated throttle regression test re-enables specific rates via
# override_settings.
if 'test' in sys.argv:
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        'login': None, 'otp': None, 'result_search': None, 'result_download': None,
        'website_read': None, 'website_search': None,
    }

# Re-enable the interactive Browsable API ONLY in local development. In
# production (DEBUG=False) the API answers JSON only, so hitting any endpoint
# with ?format=api no longer renders the public HTML explorer / write forms.
if DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ]

# --------------------------------------------------
# CORS / CSRF / PORTAL ORIGINS  — fully env-driven (no hardcoded hosts)
# --------------------------------------------------
# Every allowed origin comes from the environment, so a new server or domain
# needs ZERO code changes — just set the vars in server/.env. Localhost-only
# defaults keep local development working out of the box.
#
#   CORS_ALLOWED_ORIGINS    comma-separated full origins (scheme://host[:port])
#   STUDENT_PORTAL_ORIGINS  origins that map to the student portal
#   ADMIN_PORTAL_ORIGINS    origins that map to the admin portal
#   CSRF_TRUSTED_ORIGINS    (optional) extra CSRF origins; defaults to the CORS set
#   EXTRA_TRUSTED_ORIGINS   (optional) origins appended to ALL of the above
#
# SAFETY: CORS_ALLOW_ALL_ORIGINS stays False. With credentials enabled a
# wildcard is both forbidden by browsers and insecure, so origins are always
# an explicit allow-list.

# Localhost dev defaults (used only when the matching env var is unset).
_DEV_STUDENT_ORIGINS = [
    "http://localhost:8080", "http://localhost:8081", "http://localhost:8082",
    "http://127.0.0.1:8080", "http://127.0.0.1:8082",
    "http://localhost:5199", "http://127.0.0.1:5199",  # .claude/launch.json student-dev
]
_DEV_ADMIN_ORIGINS = [
    "http://localhost:3000", "http://localhost:5173",
    "http://127.0.0.1:3000", "http://127.0.0.1:5173",
    "http://localhost:5198", "http://127.0.0.1:5198",  # .claude/launch.json admin-dev
    "http://localhost:5197", "http://127.0.0.1:5197",  # .claude/launch.json admin-dev-alt
]


def _origins(*groups):
    """Flatten, normalise (trim + drop trailing slash) and de-duplicate origins."""
    seen, out = set(), []
    for group in groups:
        for origin in group:
            o = (origin or "").strip().rstrip("/")
            if o and o not in seen:
                seen.add(o)
                out.append(o)
    return out


# Extra origins are folded into every list, so one env var can authorise a whole
# new deployment for CORS, CSRF and portal routing at once.
_EXTRA_ORIGINS = config('EXTRA_TRUSTED_ORIGINS', default='', cast=Csv())

# Portal routing: decides which portal a login targets when the client does not
# send an explicit `portal` field. Matched EXACTLY against the request Origin —
# keep the student/admin sets disjoint.
STUDENT_PORTAL_ORIGINS = _origins(
    config('STUDENT_PORTAL_ORIGINS', default=','.join(_DEV_STUDENT_ORIGINS), cast=Csv()),
    _EXTRA_ORIGINS,
)
ADMIN_PORTAL_ORIGINS = _origins(
    config('ADMIN_PORTAL_ORIGINS', default=','.join(_DEV_ADMIN_ORIGINS), cast=Csv()),
    _EXTRA_ORIGINS,
)

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# The admin SPA sends `X-Portal: admin` with every request (per-portal session
# cookies — see apps.authentication.portal_sessions). The header must be in
# the CORS allow-list or cross-origin dev setups fail the preflight.
from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOW_HEADERS = list(default_headers) + ['x-portal']

# CORS allow-list: explicit env value if given, otherwise the union of both
# portal origin sets (which already include EXTRA + dev defaults).
CORS_ALLOWED_ORIGINS = _origins(
    config('CORS_ALLOWED_ORIGINS', default='', cast=Csv()),
    STUDENT_PORTAL_ORIGINS,
    ADMIN_PORTAL_ORIGINS,
)

# Every origin that can reach the site must also be CSRF-trusted. Default to the
# CORS set; an explicit CSRF_TRUSTED_ORIGINS env can add more.
CSRF_TRUSTED_ORIGINS = _origins(
    config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv()),
    CORS_ALLOWED_ORIGINS,
)

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
# Secure-by-default in production: unless explicitly overridden, the CSRF cookie
# is only sent over HTTPS whenever DEBUG is off. Local dev (DEBUG=True) keeps it
# False so the plain-HTTP localhost flow still works.
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=not DEBUG, cast=bool)
CSRF_USE_SESSIONS = False
CSRF_COOKIE_NAME = 'csrftoken'

CSRF_FAILURE_VIEW = 'apps.authentication.csrf_handler.csrf_failure'

# --------------------------------------------------
# HTTPS / REVERSE-PROXY SECURITY  — all env-driven so the same code runs in
# local development (plain HTTP) and behind the production Nginx TLS proxy.
# --------------------------------------------------
# When Django sits behind Nginx which terminates TLS, requests arrive over
# plain HTTP with an X-Forwarded-Proto header set by the proxy. Enabling this
# makes request.is_secure() (and secure-cookie/CSRF logic) trust that header.
# ONLY enable it when the proxy strips/overrides the client's own header
# (the generated Nginx config does).
if config('USE_X_FORWARDED_PROTO', default=False, cast=bool):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# When True, the app trusts the reverse proxy's forwarding headers. The nginx
# config sets X-Real-IP to the real client address (and cannot be spoofed by the
# client), so client-IP resolution and DRF throttles read that instead of the
# left-most X-Forwarded-For entry (which IS client-spoofable). Tied to the same
# "behind our nginx" signal as the SSL header above.
TRUST_PROXY_HEADERS = config('USE_X_FORWARDED_PROTO', default=False, cast=bool)

# HTTP -> HTTPS redirect is handled by Nginx (cheaper, and it must also serve
# the ACME challenge over HTTP), so SECURE_SSL_REDIRECT stays off by default.
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)

# HSTS is emitted by Nginx on HTTPS responses; keep Django's own HSTS off by
# default to avoid double headers, but allow enabling via env if Nginx is
# ever removed from the stack.
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)

# Misc security headers Django can add itself (Nginx repeats them for static
# responses that never reach Django).
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# --------------------------------------------------
# SESSION
# --------------------------------------------------
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
# Secure-by-default in production (see CSRF_COOKIE_SECURE): only sent over HTTPS
# whenever DEBUG is off, unless an explicit env value overrides it. Dev stays
# False so plain-HTTP localhost sessions keep working.
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)

# Default session lifetime for a normal login (no "Remember Me").
# 20 days: a normal session stays valid for ~3 weeks of inactivity, and with
# sliding expiration (below) an active user is never logged out unexpectedly.
SESSION_COOKIE_AGE = 60 * 60 * 24 * 20  # 20 days

# Lifetime applied when the user ticks "Remember Me". Sessions cannot be truly
# infinite, so we use a very long window (10 years) which is effectively
# "until the user explicitly logs out".
REMEMBER_ME_SESSION_AGE = 60 * 60 * 24 * 365 * 10  # ~10 years

# CRITICAL: extend the session expiry on every request (sliding expiration).
# Without this the expiry is fixed at login time and an *active* user is logged
# out the moment the original window elapses, regardless of activity. With it,
# any request resets the countdown so an active user is never logged out
# unexpectedly, and an idle session still survives the full window above.
SESSION_SAVE_EVERY_REQUEST = True

SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_NAME = 'sessionid'
# Separate cookie for the admin SPA's session (see
# apps.authentication.portal_sessions) so admin + student logins coexist.
ADMIN_SESSION_COOKIE_NAME = 'admin_sessionid'

# --------------------------------------------------
# EMAIL CONFIGURATION
# --------------------------------------------------
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
# STARTTLS (port 587) vs implicit SSL (port 465). Never enable both — the
# deploy config keeps them mutually exclusive.
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@example.com')
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=30, cast=int)
# Public contact / reply-to address (the "info" mailbox). CONTACT_EMAIL is
# available to email templates / as a Reply-To; SERVER_EMAIL is what Django
# uses as the From on admin error reports.
CONTACT_EMAIL = config('CONTACT_EMAIL', default='')
SERVER_EMAIL = config('SERVER_EMAIL', default=(CONTACT_EMAIL or DEFAULT_FROM_EMAIL))

# Public URLs used inside outgoing emails (logo, call-to-action links).
# In production these come from server/.env (deploy.sh derives them from the
# domains in config.env); the defaults below are the production domains so
# emails still link correctly even if the env vars are ever missing.
STUDENT_PORTAL_URL = config('STUDENT_PORTAL_URL', default='https://spisg.gov.bd').rstrip('/')
ADMIN_PORTAL_URL = config('ADMIN_PORTAL_URL', default='https://su.spisg.gov.bd').rstrip('/')
# The institute logo shown at the top of every email. Served by the student
# SPA (public/spi-logo.png) so it is always reachable from email clients.
EMAIL_LOGO_URL = config('EMAIL_LOGO_URL', default=f'{STUDENT_PORTAL_URL}/spi-logo.png')

# --------------------------------------------------
# GOOGLE SIGN-IN (student portal)
# --------------------------------------------------
# OAuth 2.0 Web Client ID from the Google Cloud Console. The student SPA uses it
# to obtain an access token; the backend verifies that token's audience matches
# this same ID (guards against token substitution). Leave blank to disable the
# "Continue with Google" flow — the endpoint then returns a clear error.
GOOGLE_OAUTH_CLIENT_ID = config('GOOGLE_OAUTH_CLIENT_ID', default='')

# --------------------------------------------------
# LOGGING — ERROR+ records become System Reports (admin dashboard)
# --------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'system_reports': {
            'level': 'ERROR',
            'class': 'apps.system_reports.log_handler.SystemReportLogHandler',
        },
    },
    'root': {
        'handlers': ['console', 'system_reports'],
        'level': 'INFO',
    },
}

# System Reports thresholds (all overridable via env-less settings)
SYSTEM_REPORTS_SLOW_REQUEST_SECONDS = 3.0
SYSTEM_REPORTS_SLOW_QUERY_SECONDS = 1.0
SYSTEM_REPORTS_CPU_ALERT_PERCENT = 90
SYSTEM_REPORTS_MEMORY_ALERT_PERCENT = 90
SYSTEM_REPORTS_DISK_ALERT_PERCENT = 90

# --------------------------------------------------
# OTP CONFIGURATION
# --------------------------------------------------
OTP_EXPIRY_MINUTES = config('OTP_EXPIRY_MINUTES', default=10, cast=int)
OTP_MAX_ATTEMPTS = config('OTP_MAX_ATTEMPTS', default=3, cast=int)
PASSWORD_RESET_RATE_LIMIT_PER_HOUR = config('PASSWORD_RESET_RATE_LIMIT_PER_HOUR', default=3, cast=int)

# --------------------------------------------------
# WEB PUSH (VAPID) — standard Web Push, no Firebase required.
# Keys are generated once by deploy.sh into config.env (persisted, never
# regenerated so existing subscriptions keep working). When unset, push is
# simply disabled and the rest of the notification system is unaffected.
# VAPID_SUBJECT must be a mailto: or https: contact URL per the spec.
# --------------------------------------------------
VAPID_PUBLIC_KEY = config('VAPID_PUBLIC_KEY', default='')
VAPID_PRIVATE_KEY = config('VAPID_PRIVATE_KEY', default='')
VAPID_SUBJECT = config('VAPID_SUBJECT', default='mailto:admin@spisg.gov.bd')
