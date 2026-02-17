"""
Test file serving for document preview
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')
django.setup()

from utils.structured_file_storage import structured_storage
from utils.file_storage import file_storage
from apps.documents.models import Document

def test_file_serving():
    print("=" * 70)
    print("Testing File Serving for Document Preview")
    print("=" * 70)
    
    # Get a recent admission document
    doc = Document.objects.filter(source_type='admission').order_by('-uploadDate').first()
    
    if not doc:
        print("❌ No admission documents found")
        return
    
    print(f"\nDocument:")
    print(f"  ID: {doc.id}")
    print(f"  File Name: {doc.fileName}")
    print(f"  File Path: {doc.filePath}")
    print(f"  File URL: {doc.file_url}")
    
    print("\n" + "-" * 70)
    print("Testing Structured Storage:")
    print("-" * 70)
    
    # Test structured storage
    file_info = structured_storage.get_file_info(doc.filePath)
    if file_info:
        print(f"✅ Structured storage found file")
        print(f"  Exists: {file_info.get('exists')}")
        print(f"  Storage Path: {file_info.get('storage_path')}")
        print(f"  File Size: {file_info.get('file_size')} bytes")
        print(f"  MIME Type: {file_info.get('mime_type')}")
    else:
        print(f"❌ Structured storage did NOT find file")
    
    print("\n" + "-" * 70)
    print("Testing Old Storage:")
    print("-" * 70)
    
    # Test old storage
    file_info_old = file_storage.get_file_info(doc.filePath)
    if file_info_old and file_info_old.get('exists'):
        print(f"✅ Old storage found file")
        print(f"  Storage Path: {file_info_old.get('storage_path')}")
    else:
        print(f"❌ Old storage did NOT find file")
    
    print("\n" + "-" * 70)
    print("Testing Document Model:")
    print("-" * 70)
    
    # Test document model method
    doc_file_info = doc.get_file_info()
    if doc_file_info and doc_file_info.get('exists'):
        print(f"✅ Document.get_file_info() found file")
        print(f"  Storage Path: {doc_file_info.get('storage_path')}")
    else:
        print(f"❌ Document.get_file_info() did NOT find file")
    
    print("\n" + "=" * 70)
    print("Test Complete!")
    print("=" * 70)

if __name__ == '__main__':
    test_file_serving()
