#!/usr/bin/env python
"""
Test script to check alumni URL patterns
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from django.urls import get_resolver
from rest_framework.routers import DefaultRouter
from apps.alumni.views import AlumniViewSet

print("\n" + "="*80)
print("ALUMNI URL PATTERNS")
print("="*80 + "\n")

# Check router registration
router = DefaultRouter()
router.register(r'alumni', AlumniViewSet, basename='alumni')

print("Router URLs:")
for pattern in router.urls:
    print(f"  {pattern.pattern}")

print("\n" + "="*80)
print("VIEWSET ACTIONS")
print("="*80 + "\n")

# Check viewset actions
viewset = AlumniViewSet()
print(f"Viewset class: {viewset.__class__.__name__}")
print(f"\nCustom actions:")

# Get all methods with action decorator
for attr_name in dir(viewset):
    attr = getattr(viewset, attr_name)
    if hasattr(attr, 'mapping'):
        print(f"  {attr_name}: {attr.mapping}")
        if hasattr(attr, 'detail'):
            print(f"    detail={attr.detail}")
        if hasattr(attr, 'url_path'):
            print(f"    url_path={attr.url_path}")
        if hasattr(attr, 'url_name'):
            print(f"    url_name={attr.url_name}")

print("\n" + "="*80 + "\n")
