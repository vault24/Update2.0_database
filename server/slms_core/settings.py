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

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
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
]

# --------------------------------------------------
# MIDDLEWARE
# --------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    # CORS MUST BE BEFORE CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    'apps.authentication.middleware.RoleBasedAccessMiddleware',
    'apps.activity_logs.middleware.ActivityLogMiddleware',
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
            'hosts': [('127.0.0.1', 6379)],
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
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# --------------------------------------------------
# ✅ CORS (FINAL – NO BUG)
# --------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",      # admin dev
    "http://localhost:5173",      # admin vite dev
    "http://localhost:8080",      # student dev
    "http://localhost:8081", 
    "http://localhost:8082",      # student dev (current)
    "http://127.0.0.1:3000",      # admin dev
    "http://127.0.0.1:5173",      # admin vite dev
    "http://127.0.0.1:8080",      # student dev
    "http://127.0.0.1:8082",      # student dev (current)
]

# --------------------------------------------------
# ✅ CSRF
# --------------------------------------------------
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",      # admin dev
    "http://localhost:5173",      # admin vite dev
    "http://localhost:8080",      # student dev
    "http://localhost:8081",
    "http://localhost:8082",      # student dev (current)
    "http://127.0.0.1:3000",      # admin dev
    "http://127.0.0.1:5173",      # admin vite dev
    "http://127.0.0.1:8080",      # student dev
    "http://127.0.0.1:8082",      # student dev (current)
]

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False   # True when HTTPS
CSRF_USE_SESSIONS = False
CSRF_COOKIE_NAME = 'csrftoken'

CSRF_FAILURE_VIEW = 'apps.authentication.csrf_handler.csrf_failure'

# --------------------------------------------------
# SESSION
# --------------------------------------------------
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # True when HTTPS
SESSION_COOKIE_AGE = 86400
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_NAME = 'sessionid'

# --------------------------------------------------
# EMAIL CONFIGURATION
# --------------------------------------------------
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@example.com')
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=30, cast=int)

# --------------------------------------------------
# OTP CONFIGURATION
# --------------------------------------------------
OTP_EXPIRY_MINUTES = config('OTP_EXPIRY_MINUTES', default=10, cast=int)
OTP_MAX_ATTEMPTS = config('OTP_MAX_ATTEMPTS', default=3, cast=int)
PASSWORD_RESET_RATE_LIMIT_PER_HOUR = config('PASSWORD_RESET_RATE_LIMIT_PER_HOUR', default=3, cast=int)
