# Simple & Scalable Document Storage System

## Overview

A clean, well-structured document storage system using local filesystem and PostgreSQL database. No cloud services, no complex infrastructure - just solid, maintainable code.

## Current System Analysis

### ✅ What You Already Have (Good!)
- Hierarchical folder structure
- File validation and security
- Basic CRUD operations
- Document metadata in database
- Structured storage service

### 🔧 What Needs Improvement
1. **Better organization** - Optimize folder structure for performance
2. **Duplicate prevention** - Avoid storing same file multiple times
3. **File integrity** - Ensure files aren't corrupted
4. **Search capability** - Find documents quickly
5. **Access control** - Proper permissions
6. **Cleanup utilities** - Remove orphaned files

## Improved Directory Structure

```
storage/Documents/
├── Student_Documents/
│   ├── 2024/                           # Year-based partitioning
│   │   ├── computer-technology/
│   │   │   ├── 2024-2025/             # Session
│   │   │   │   ├── 1st-shift/
│   │   │   │   │   ├── SIPI-889900/   # Student ID (unique)
│   │   │   │   │   │   ├── photo.jpg
│   │   │   │   │   │   ├── birth_certificate.pdf
│   │   │   │   │   │   ├── nid.pdf
│   │   │   │   │   │   ├── father_nid.pdf
│   │   │   │   │   │   ├── mother_nid.pdf
│   │   │   │   │   │   ├── ssc_marksheet.pdf
│   │   │   │   │   │   ├── ssc_certificate.pdf
│   │   │   │   │   │   └── other/
│   │   │   │   │   │       └── medical_certificate.pdf
│   │   ├── civil-engineering/
│   │   └── ...
│   ├── 2025/
│   └── ...
├── Teacher_Documents/
│   ├── 2024/
│   │   ├── computer-technology/
│   │   │   ├── T-12345/
│   │   │   │   ├── photo.jpg
│   │   │   │   ├── nid.pdf
│   │   │   │   └── certificates/
│   └── ...
├── Alumni_Documents/
│   ├── 2024/
│   │   ├── computer-technology/
│   │   │   ├── A-67890/
│   │   │   │   └── ...
│   └── ...
└── System_Documents/
    ├── notices/
    ├── forms/
    └── templates/
```

**Why this structure?**
- Year-based partitioning prevents folders from getting too large
- Easy to archive old years
- Fast file system operations
- Simple backup strategy (backup by year)

## Database Schema (Simplified)

```python
class Document(models.Model):
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, null=True)
    
    # File info
    fileName = models.CharField(max_length=255)
    fileType = models.CharField(max_length=50)
    filePath = models.CharField(max_length=500, unique=True)  # Unique path
    fileSize = models.BigIntegerField()
    fileHash = models.CharField(max_length=64, db_index=True)  # For duplicate detection
    
    # Organization
    document_type = models.CharField(max_length=50)  # student, teacher, alumni
    document_category = models.CharField(max_length=50)  # photo, nid, etc.
    year = models.IntegerField(db_index=True)  # Partition key
    
    # Metadata
    uploadDate = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=20, default='active', db_index=True)
    
    # Search (PostgreSQL full-text search)
    search_text = models.TextField(blank=True)  # Searchable text
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'document_category']),
            models.Index(fields=['year', 'document_type']),
            models.Index(fields=['fileHash']),  # Duplicate detection
            models.Index(fields=['status', 'uploadDate']),
        ]
```

## Key Improvements

### 1. Duplicate Detection

```python
# server/utils/duplicate_detector.py

import hashlib

class DuplicateDetector:
    """Detect duplicate files before saving"""
    
    @staticmethod
    def calculate_hash(file_obj):
        """Calculate SHA256 hash of file"""
        hash_sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            hash_sha256.update(chunk)
        file_obj.seek(0)  # Reset file pointer
        return hash_sha256.hexdigest()
    
    @staticmethod
    def find_duplicate(file_hash):
        """Check if file already exists"""
        from apps.documents.models import Document
        return Document.objects.filter(
            fileHash=file_hash,
            status='active'
        ).first()
    
    @staticmethod
    def check_before_upload(file_obj, student_id=None):
        """Check for duplicates before uploading"""
        file_hash = DuplicateDetector.calculate_hash(file_obj)
        
        # Check if exact same file exists
        duplicate = DuplicateDetector.find_duplicate(file_hash)
        
        if duplicate:
            # Same file already exists
            if duplicate.student_id == student_id:
                return {
                    'is_duplicate': True,
                    'message': 'This exact file is already uploaded',
                    'existing_document': duplicate
                }
        
        return {
            'is_duplicate': False,
            'file_hash': file_hash
        }
```

### 2. Simple Search

```python
# server/apps/documents/search.py

from django.db.models import Q

class DocumentSearch:
    """Simple but effective document search"""
    
    @staticmethod
    def search(query, filters=None):
        """Search documents by filename, category, or student"""
        from apps.documents.models import Document
        
        queryset = Document.objects.filter(status='active')
        
        # Text search
        if query:
            queryset = queryset.filter(
                Q(fileName__icontains=query) |
                Q(document_category__icontains=query) |
                Q(search_text__icontains=query)
            )
        
        # Apply filters
        if filters:
            if 'student_id' in filters:
                queryset = queryset.filter(student_id=filters['student_id'])
            if 'document_type' in filters:
                queryset = queryset.filter(document_type=filters['document_type'])
            if 'category' in filters:
                queryset = queryset.filter(document_category=filters['category'])
            if 'year' in filters:
                queryset = queryset.filter(year=filters['year'])
        
        return queryset.order_by('-uploadDate')
    
    @staticmethod
    def search_student_documents(student_id, query=None):
        """Search within a student's documents"""
        filters = {'student_id': student_id}
        return DocumentSearch.search(query, filters)
```

### 3. File Integrity Checker

```python
# server/apps/documents/management/commands/check_integrity.py

from django.core.management.base import BaseCommand
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage
import hashlib

class Command(BaseCommand):
    help = 'Check integrity of all documents'
    
    def handle(self, *args, **options):
        documents = Document.objects.filter(status='active')
        
        missing = []
        corrupted = []
        healthy = 0
        
        for doc in documents:
            # Check if file exists
            file_info = structured_storage.get_file_info(doc.filePath)
            
            if not file_info or not file_info['exists']:
                missing.append(doc.id)
                self.stdout.write(
                    self.style.ERROR(f'Missing: {doc.fileName} ({doc.id})')
                )
                continue
            
            # Check file hash
            if doc.fileHash:
                with open(file_info['storage_path'], 'rb') as f:
                    current_hash = hashlib.sha256()
                    for chunk in iter(lambda: f.read(4096), b""):
                        current_hash.update(chunk)
                    current_hash = current_hash.hexdigest()
                
                if current_hash != doc.fileHash:
                    corrupted.append(doc.id)
                    self.stdout.write(
                        self.style.ERROR(f'Corrupted: {doc.fileName} ({doc.id})')
                    )
                    continue
            
            healthy += 1
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'\nIntegrity Check Complete:'))
        self.stdout.write(f'  Healthy: {healthy}')
        self.stdout.write(f'  Missing: {len(missing)}')
        self.stdout.write(f'  Corrupted: {len(corrupted)}')
```

### 4. Cleanup Utilities

```python
# server/apps/documents/management/commands/cleanup_documents.py

from django.core.management.base import BaseCommand
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage
from pathlib import Path

class Command(BaseCommand):
    help = 'Clean up orphaned files and old documents'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--orphaned',
            action='store_true',
            help='Remove orphaned files not in database',
        )
        parser.add_argument(
            '--deleted',
            action='store_true',
            help='Remove files for deleted documents',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without deleting',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if options['orphaned']:
            self.cleanup_orphaned_files(dry_run)
        
        if options['deleted']:
            self.cleanup_deleted_documents(dry_run)
    
    def cleanup_orphaned_files(self, dry_run):
        """Remove files not referenced in database"""
        self.stdout.write('Checking for orphaned files...')
        
        # Get all file paths from database
        db_paths = set(
            Document.objects.values_list('filePath', flat=True)
        )
        
        # Scan storage directory
        storage_root = structured_storage.storage_root
        orphaned = []
        
        for file_path in storage_root.rglob('*'):
            if file_path.is_file():
                relative_path = str(file_path.relative_to(storage_root))
                if relative_path not in db_paths:
                    orphaned.append(file_path)
        
        self.stdout.write(f'Found {len(orphaned)} orphaned files')
        
        if not dry_run:
            for file_path in orphaned:
                file_path.unlink()
                self.stdout.write(f'Deleted: {file_path}')
        else:
            for file_path in orphaned:
                self.stdout.write(f'Would delete: {file_path}')
    
    def cleanup_deleted_documents(self, dry_run):
        """Remove physical files for deleted documents"""
        deleted_docs = Document.objects.filter(status='deleted')
        
        self.stdout.write(f'Found {deleted_docs.count()} deleted documents')
        
        for doc in deleted_docs:
            if not dry_run:
                structured_storage.delete_file(doc.filePath)
                self.stdout.write(f'Deleted file: {doc.filePath}')
            else:
                self.stdout.write(f'Would delete: {doc.filePath}')
```

### 5. Storage Statistics

```python
# server/apps/documents/management/commands/storage_stats.py

from django.core.management.base import BaseCommand
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage
from django.db.models import Sum, Count

class Command(BaseCommand):
    help = 'Show storage statistics'
    
    def handle(self, *args, **options):
        # Overall stats
        total_docs = Document.objects.filter(status='active').count()
        total_size = Document.objects.filter(status='active').aggregate(
            total=Sum('fileSize')
        )['total'] or 0
        
        self.stdout.write(self.style.SUCCESS('\n=== Storage Statistics ===\n'))
        self.stdout.write(f'Total Documents: {total_docs:,}')
        self.stdout.write(f'Total Size: {total_size / (1024**3):.2f} GB')
        
        # By document type
        self.stdout.write('\n--- By Document Type ---')
        by_type = Document.objects.filter(status='active').values(
            'document_type'
        ).annotate(
            count=Count('id'),
            size=Sum('fileSize')
        )
        
        for item in by_type:
            self.stdout.write(
                f"{item['document_type']}: {item['count']:,} docs, "
                f"{item['size'] / (1024**2):.2f} MB"
            )
        
        # By year
        self.stdout.write('\n--- By Year ---')
        by_year = Document.objects.filter(status='active').values(
            'year'
        ).annotate(
            count=Count('id'),
            size=Sum('fileSize')
        ).order_by('-year')
        
        for item in by_year:
            self.stdout.write(
                f"{item['year']}: {item['count']:,} docs, "
                f"{item['size'] / (1024**2):.2f} MB"
            )
        
        # By category
        self.stdout.write('\n--- By Category ---')
        by_category = Document.objects.filter(status='active').values(
            'document_category'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        for item in by_category:
            self.stdout.write(
                f"{item['document_category']}: {item['count']:,} docs"
            )
```

## Enhanced API Endpoints

### Simple but Complete

```python
# server/apps/documents/views.py (additions)

@action(detail=False, methods=['get'], url_path='search')
def search_documents(self, request):
    """
    Search documents
    GET /api/documents/search/?q=query&student=uuid&type=student
    """
    from .search import DocumentSearch
    
    query = request.query_params.get('q', '')
    filters = {
        'student_id': request.query_params.get('student'),
        'document_type': request.query_params.get('type'),
        'category': request.query_params.get('category'),
        'year': request.query_params.get('year'),
    }
    filters = {k: v for k, v in filters.items() if v}
    
    results = DocumentSearch.search(query, filters)
    serializer = DocumentSerializer(results[:100], many=True)
    
    return Response({
        'count': results.count(),
        'results': serializer.data
    })

@action(detail=False, methods=['get'], url_path='stats')
def get_stats(self, request):
    """
    Get storage statistics
    GET /api/documents/stats/
    """
    from django.db.models import Sum, Count
    
    stats = {
        'total_documents': Document.objects.filter(status='active').count(),
        'total_size_mb': (
            Document.objects.filter(status='active').aggregate(
                total=Sum('fileSize')
            )['total'] or 0
        ) / (1024 * 1024),
        'by_type': list(
            Document.objects.filter(status='active').values('document_type').annotate(
                count=Count('id'),
                size_mb=Sum('fileSize') / (1024 * 1024)
            )
        ),
        'by_year': list(
            Document.objects.filter(status='active').values('year').annotate(
                count=Count('id')
            ).order_by('-year')
        ),
    }
    
    return Response(stats)
```

## Simple Backup Strategy

### Manual Backup Script

```bash
#!/bin/bash
# backup_documents.sh

BACKUP_DIR="/backup/documents"
STORAGE_DIR="/path/to/storage/Documents"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup files (incremental)
rsync -av --progress \
    --backup --backup-dir="$BACKUP_DIR/incremental_$DATE" \
    "$STORAGE_DIR/" \
    "$BACKUP_DIR/current/"

# Backup database
python manage.py dumpdata documents > "$BACKUP_DIR/documents_$DATE.json"

# Compress old backups
find "$BACKUP_DIR" -name "incremental_*" -mtime +7 -exec tar -czf {}.tar.gz {} \; -exec rm -rf {} \;

echo "Backup completed: $DATE"
```

### Restore Script

```bash
#!/bin/bash
# restore_documents.sh

BACKUP_DIR="/backup/documents"
STORAGE_DIR="/path/to/storage/Documents"

# Restore files
rsync -av "$BACKUP_DIR/current/" "$STORAGE_DIR/"

# Restore database
python manage.py loaddata "$BACKUP_DIR/documents_latest.json"

echo "Restore completed"
```

## Performance Tips

### 1. Database Indexes (Already in model)
```python
# These indexes make queries fast
indexes = [
    models.Index(fields=['student', 'document_category']),  # Fast student doc lookup
    models.Index(fields=['year', 'document_type']),         # Fast year filtering
    models.Index(fields=['fileHash']),                      # Fast duplicate check
    models.Index(fields=['status', 'uploadDate']),          # Fast recent docs
]
```

### 2. Query Optimization
```python
# Good: Use select_related for foreign keys
documents = Document.objects.select_related('student').filter(status='active')

# Good: Use only() to fetch only needed fields
documents = Document.objects.only('id', 'fileName', 'fileSize').filter(status='active')

# Good: Use iterator() for large querysets
for doc in Document.objects.filter(status='active').iterator(chunk_size=100):
    process(doc)
```

### 3. File System Tips
- Use SSD for storage directory
- Keep folders under 10,000 files each (year partitioning helps)
- Regular cleanup of deleted documents
- Monitor disk space

## Maintenance Tasks

### Daily
```bash
# Check disk space
df -h /path/to/storage

# Check for errors in logs
tail -f /var/log/django/documents.log
```

### Weekly
```bash
# Check file integrity
python manage.py check_integrity

# Get storage stats
python manage.py storage_stats

# Backup
./backup_documents.sh
```

### Monthly
```bash
# Clean up orphaned files
python manage.py cleanup_documents --orphaned --dry-run
python manage.py cleanup_documents --orphaned

# Clean up deleted documents
python manage.py cleanup_documents --deleted
```

## Configuration

### settings.py
```python
# Document Storage Settings
STRUCTURED_STORAGE_ROOT = BASE_DIR / 'storage' / 'Documents'
FILE_STORAGE_URL = '/files/'

# File size limits (in bytes)
MAX_PHOTO_SIZE = 5 * 1024 * 1024      # 5MB
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file types
ALLOWED_PHOTO_TYPES = ['jpg', 'jpeg', 'png']
ALLOWED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx']

# Features
ENABLE_DUPLICATE_DETECTION = True
ENABLE_FILE_INTEGRITY_CHECK = True
```

## Summary

This design gives you:

✅ **Simple** - No complex cloud services or infrastructure
✅ **Scalable** - Year-based partitioning handles growth
✅ **Maintainable** - Clear structure, good utilities
✅ **Reliable** - Duplicate detection, integrity checks
✅ **Fast** - Proper indexes, optimized queries
✅ **Secure** - Access control, validation

Everything runs on your server with your database. Clean, simple, effective.

