"""
Test if real uploaded files can be accessed
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from apps.documents.models import Document
from utils.structured_file_storage import structured_storage

# Find document with the real file
doc = Document.objects.filter(filePath__contains='mahadi_SIPI-56435').first()

if doc:
    print(f"Document Found:")
    print(f"  Path: {doc.filePath}")
    print(f"  URL: {doc.file_url}")
    
    # Test if file can be found
    file_info = structured_storage.get_file_info(doc.filePath)
    if file_info and file_info.get('exists'):
        print(f"✅ File found by structured storage!")
    else:
        print(f"❌ File NOT found by structured storage")
        print(f"  Expected path: {doc.filePath}")
else:
    print("No document found with that path")
    
    # List all documents
    print("\nAll documents:")
    for d in Document.objects.all()[:10]:
        print(f"  {d.filePath}")
