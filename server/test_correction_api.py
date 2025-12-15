#!/usr/bin/env python
"""
Test correction requests API response
"""
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.correction_requests.models import CorrectionRequest
from apps.correction_requests.serializers import CorrectionRequestSerializer

def main():
    print("Testing correction requests API serialization...")
    
    # Get all correction requests
    requests = CorrectionRequest.objects.all()
    
    if requests.exists():
        # Serialize the first request
        first_request = requests.first()
        serializer = CorrectionRequestSerializer(first_request)
        
        print("Sample serialized correction request:")
        print(json.dumps(serializer.data, indent=2, default=str))
        
        print("\nChecking requested_by structure:")
        requested_by = serializer.data.get('requested_by')
        if requested_by:
            print(f"Type: {type(requested_by)}")
            print(f"Keys: {list(requested_by.keys()) if isinstance(requested_by, dict) else 'Not a dict'}")
            print(f"Content: {requested_by}")
        
        print("\nChecking reviewed_by structure:")
        reviewed_by = serializer.data.get('reviewed_by')
        if reviewed_by:
            print(f"Type: {type(reviewed_by)}")
            print(f"Keys: {list(reviewed_by.keys()) if isinstance(reviewed_by, dict) else 'Not a dict'}")
            print(f"Content: {reviewed_by}")
        else:
            print("reviewed_by is None/null")
            
    else:
        print("No correction requests found.")

if __name__ == '__main__':
    main()