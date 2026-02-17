"""
Quick setup script for structured document storage system
"""
import os
import sys
from pathlib import Path

# Add Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'slms_core.settings')

import django
django.setup()

from django.conf import settings
from utils.structured_file_storage import structured_storage
from apps.documents.models import Document


def create_storage_structure():
    """Create the base storage directory structure"""
    print("Creating storage directory structure...")
    
    base_path = structured_storage.storage_root
    
    # Create main document type folders
    for doc_type, folder_name in structured_storage.DOCUMENT_TYPES.items():
        folder_path = base_path / folder_name
        folder_path.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ Created: {folder_path}")
    
    print("✓ Storage structure created successfully!\n")


def check_database_migration():
    """Check if database migration has been run"""
    print("Checking database migration status...")
    
    try:
        # Try to access new fields
        doc = Document.objects.first()
        if doc:
            # Check if new fields exist
            hasattr(doc, 'document_type')
            hasattr(doc, 'document_category')
            print("  ✓ Database migration completed\n")
            return True
        else:
            print("  ⚠ No documents in database to check\n")
            return True
    except Exception as e:
        print(f"  ✗ Database migration not completed: {str(e)}")
        print("  → Run: python manage.py migrate documents\n")
        return False


def display_storage_stats():
    """Display current storage statistics"""
    print("Current Storage Statistics:")
    print("-" * 60)
    
    try:
        stats = structured_storage.get_storage_stats()
        
        print(f"Storage Root: {stats['storage_root']}")
        print(f"Total Files: {stats['total_files']}")
        print(f"Total Size: {stats.get('total_size_mb', 0):.2f} MB ({stats.get('total_size_gb', 0):.2f} GB)")
        print()
        
        if stats.get('by_type'):
            print("By Document Type:")
            for doc_type, type_stats in stats['by_type'].items():
                print(f"  {doc_type.capitalize()}:")
                print(f"    Files: {type_stats['files']}")
                print(f"    Size: {type_stats['size_mb']:.2f} MB")
        
        print()
    except Exception as e:
        print(f"  ✗ Failed to get storage stats: {str(e)}\n")


def check_migration_status():
    """Check document migration status"""
    print("Document Migration Status:")
    print("-" * 60)
    
    try:
        total_docs = Document.objects.filter(status='active').count()
        
        if total_docs == 0:
            print("  No documents in database\n")
            return
        
        # Count migrated documents
        migrated_docs = Document.objects.filter(
            status='active',
            filePath__startswith='Student_Documents/'
        ).count() + Document.objects.filter(
            status='active',
            filePath__startswith='Teacher_Documents/'
        ).count() + Document.objects.filter(
            status='active',
            filePath__startswith='Alumni_Documents/'
        ).count()
        
        not_migrated = total_docs - migrated_docs
        migration_percentage = (migrated_docs / total_docs * 100) if total_docs > 0 else 0
        
        print(f"Total Documents: {total_docs}")
        print(f"Migrated: {migrated_docs}")
        print(f"Not Migrated: {not_migrated}")
        print(f"Migration Progress: {migration_percentage:.1f}%")
        
        if not_migrated > 0:
            print()
            print("To migrate existing documents, run:")
            print("  python manage.py migrate_to_structured_storage --dry-run")
            print("  python manage.py migrate_to_structured_storage")
        else:
            print("  ✓ All documents migrated!")
        
        print()
    except Exception as e:
        print(f"  ✗ Failed to check migration status: {str(e)}\n")


def display_next_steps():
    """Display next steps for implementation"""
    print("Next Steps:")
    print("-" * 60)
    print("1. Update URL configuration:")
    print("   Add to slms_core/urls.py:")
    print("   path('api/documents/structured/', include('apps.documents.structured_urls')),")
    print()
    print("2. Test the API endpoints:")
    print("   POST /api/documents/structured/student/upload/")
    print("   GET  /api/documents/structured/student/{student_id}/")
    print()
    print("3. Migrate existing documents (if any):")
    print("   python manage.py migrate_to_structured_storage --dry-run")
    print("   python manage.py migrate_to_structured_storage")
    print()
    print("4. Update frontend to use new API endpoints")
    print()
    print("5. Review the implementation guide:")
    print("   STRUCTURED_STORAGE_IMPLEMENTATION_GUIDE.md")
    print()


def main():
    """Main setup function"""
    print("=" * 60)
    print("Structured Document Storage System Setup")
    print("=" * 60)
    print()
    
    # Step 1: Create storage structure
    create_storage_structure()
    
    # Step 2: Check database migration
    migration_ok = check_database_migration()
    
    # Step 3: Display storage stats
    display_storage_stats()
    
    # Step 4: Check migration status
    if migration_ok:
        check_migration_status()
    
    # Step 5: Display next steps
    display_next_steps()
    
    print("=" * 60)
    print("Setup Complete!")
    print("=" * 60)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nSetup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
