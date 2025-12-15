#!/usr/bin/env python
"""
Check correction requests in the database
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.correction_requests.models import CorrectionRequest

def main():
    print("Checking correction requests...")
    
    total_requests = CorrectionRequest.objects.count()
    print(f"Total correction requests: {total_requests}")
    
    if total_requests > 0:
        print("\nSample requests:")
        for req in CorrectionRequest.objects.all()[:5]:
            print(f"- {req.id}: {req.student} - {req.field_name} ({req.status})")
            print(f"  Requested by: {req.requested_by}")
            print(f"  Current: {req.current_value}")
            print(f"  Requested: {req.requested_value}")
            print()
    else:
        print("No correction requests found in the database.")

if __name__ == '__main__':
    main()