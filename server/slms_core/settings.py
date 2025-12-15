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
    default='localhost,127.0.0.1,47.128.236.25,ec2-47-128-236-25.ap-southeast-1.compute.amazonaws.com',
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
    "http://47.128.236.25",        # admin
    "http://47.128.236.25:8080",   # student
]

# --------------------------------------------------
# ✅ CSRF
# --------------------------------------------------
CSRF_TRUSTED_ORIGINS = [
    "http://47.128.236.25",
    "http://47.128.236.25:8080",
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
