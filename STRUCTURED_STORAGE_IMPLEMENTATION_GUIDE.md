# Structured Document Storage Implementation Guide

## Overview
This guide walks you through implementing and using the new structured document storage system.

## What's Been Created

### 1. Core Files
- `DOCUMENT_STORAGE_SYSTEM_DESIGN.md` - Complete system design and architecture
- `server/utils/structured_file_storage.py` - Core storage service
- `server/apps/documents/structured_serializers.py` - API serializers
- `server/apps/documents/structured_views.py` - API views
- `server/apps/documents/structured_urls.py` - URL routing
- `server/apps/documents/migrations/0003_add_structured_storage_fields.py` - Database migration
- `server/apps/documents/management/commands/migrate_to_structured_storage.py` - Migration utility

### 2. Storage Structure
```
storage/Documents/
├── Student_Documents/
│   ├── {department-code}/
│   │   ├── {session}/
│   │   │   ├── {shift}/
│   │   │   │   ├── {student-name}_{student-id}/
│   │   │   │   │   ├── photo.jpg
│   │   │   │   │   ├── birth_certificate.pdf
│   │   │   │   │   ├── nid.pdf
│   │   │   │   │   └── ...
├── Teacher_Documents/
├── Alumni_Documents/
├── Department_Documents/
└── System_Documents/
```

## Implementation Steps

### Step 1: Update Settings
Add to `server/slms_core/settings.py`:

```python
# Structured document storage
STRUCTURED_STORAGE_ROOT = BASE_DIR / 'storage' / 'Documents'
```

### Step 2: Run Database Migration
```bash
cd server
python manage.py makemigrations documents
python manage.py migrate documents
```

### Step 3: Update URL Configuration
Add to `server/slms_core/urls.py` or `server/apps/documents/urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns ...
    path('api/documents/structured/', include('apps.documents.structured_urls')),
]
```

### Step 4: Migrate Existing Documents (Optional)
```bash
# Dry run to see what will happen
python manage.py migrate_to_structured_storage --dry-run

# Migrate student documents only
python manage.py migrate_to_structured_storage --document-type=student

# Migrate all documents
python manage.py migrate_to_structured_storage --document-type=all
```

## API Endpoints

### 1. Upload Single Student Document
```http
POST /api/documents/structured/student/upload/
Content-Type: multipart/form-data

{
  "file": <file>,
  "student_id": "uuid",
  "document_category": "photo",
  "description": "Student photo"
}
```

**Document Categories:**
- `photo` - Student photo
- `birth_certificate` - Birth certificate
- `nid` - National ID
- `father_nid` - Father's NID
- `mother_nid` - Mother's NID
- `ssc_marksheet` - SSC marksheet
- `ssc_certificate` - SSC certificate
- `transcript` - Transcript
- `medical_certificate` - Medical certificate
- `quota_document` - Quota document
- `other` - Other documents

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": {
    "id": "uuid",
    "fileName": "photo.jpg",
    "fileType": "jpg",
    "category": "Photo",
    "filePath": "Student_Documents/computer-technology/2024-2025/1st-shift/MdMahadi_SIPI-889900/photo.jpg",
    "fileSize": 123456,
    "file_size_mb": 0.12,
    "file_url": "/files/Student_Documents/...",
    "document_category": "photo",
    "uploadDate": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Bulk Upload Student Documents
```http
POST /api/documents/structured/student/bulk-upload/
Content-Type: multipart/form-data

{
  "student_id": "uuid",
  "documents": [
    {
      "file": <file1>,
      "document_category": "photo",
      "description": "Student photo"
    },
    {
      "file": <file2>,
      "document_category": "birth_certificate",
      "description": "Birth certificate"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Uploaded 2 of 2 documents",
  "documents": [...],
  "errors": [],
  "stats": {
    "total": 2,
    "success": 2,
    "failed": 0
  }
}
```

### 3. List Student Documents
```http
GET /api/documents/structured/student/{student_id}/
GET /api/documents/structured/student/{student_id}/?category=photo
```

**Response:**
```json
{
  "success": true,
  "student": {
    "id": "uuid",
    "name": "Md Mahadi",
    "roll": "SIPI-889900",
    "department": "Computer Technology",
    "session": "2024-2025",
    "shift": "1st-shift"
  },
  "documents": [...],
  "grouped_documents": {
    "photo": [...],
    "birth_certificate": [...],
    "nid": [...]
  },
  "total_count": 5
}
```

### 4. Get Specific Document
```http
GET /api/documents/structured/student/{student_id}/{category}/
```

Example:
```http
GET /api/documents/structured/student/123e4567-e89b-12d3-a456-426614174000/photo/
```

### 5. Delete Document
```http
DELETE /api/documents/structured/student/{student_id}/{category}/
```

### 6. Storage Statistics
```http
GET /api/documents/structured/stats/
```

**Response:**
```json
{
  "success": true,
  "storage_stats": {
    "total_files": 1250,
    "total_size_bytes": 524288000,
    "total_size_mb": 500.0,
    "total_size_gb": 0.49,
    "by_type": {
      "student": {
        "files": 1200,
        "size_bytes": 500000000,
        "size_mb": 476.84
      },
      "teacher": {...},
      "alumni": {...}
    },
    "storage_root": "/path/to/storage/Documents"
  },
  "database_stats": {
    "total_documents": 1250,
    "student_documents": 1200,
    "teacher_documents": 30,
    "alumni_documents": 20
  }
}
```

### 7. Migration Status
```http
GET /api/documents/structured/migration-status/
```

**Response:**
```json
{
  "success": true,
  "migration_status": {
    "total_documents": 1000,
    "migrated": 850,
    "not_migrated": 150,
    "migration_percentage": 85.0,
    "is_complete": false
  }
}
```

## Usage Examples

### Python/Django Usage

```python
from utils.structured_file_storage import structured_storage
from apps.students.models import Student

# Get student
student = Student.objects.select_related('department').get(id=student_id)

# Prepare student data
student_data = {
    'department_code': student.department.code.lower().replace(' ', '-'),
    'session': student.session,
    'shift': student.shift.lower().replace(' ', '-'),
    'student_name': student.fullNameEnglish.replace(' ', ''),
    'student_id': student.currentRollNumber,
}

# Save document
file_info = structured_storage.save_student_document(
    uploaded_file=request.FILES['file'],
    student_data=student_data,
    document_category='photo',
    validate=True
)

# List student documents
documents = structured_storage.list_student_documents(student_data)

# Get file info
file_info = structured_storage.get_file_info(file_path)

# Delete file
success = structured_storage.delete_file(file_path)

# Get storage stats
stats = structured_storage.get_storage_stats()
```

### JavaScript/React Usage

```javascript
// Upload single document
const uploadDocument = async (studentId, file, category) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('student_id', studentId);
  formData.append('document_category', category);
  
  const response = await fetch('/api/documents/structured/student/upload/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  return await response.json();
};

// Bulk upload
const bulkUploadDocuments = async (studentId, documents) => {
  const formData = new FormData();
  formData.append('student_id', studentId);
  
  documents.forEach((doc, index) => {
    formData.append(`documents[${index}][file]`, doc.file);
    formData.append(`documents[${index}][document_category]`, doc.category);
    formData.append(`documents[${index}][description]`, doc.description || '');
  });
  
  const response = await fetch('/api/documents/structured/student/bulk-upload/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  return await response.json();
};

// List documents
const listDocuments = async (studentId, category = 'all') => {
  const url = category === 'all' 
    ? `/api/documents/structured/student/${studentId}/`
    : `/api/documents/structured/student/${studentId}/?category=${category}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return await response.json();
};

// Delete document
const deleteDocument = async (studentId, category) => {
  const response = await fetch(
    `/api/documents/structured/student/${studentId}/${category}/`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  return await response.json();
};
```

## Security Features

### 1. Path Traversal Prevention
- All file paths are validated to prevent directory traversal attacks
- Paths are normalized and checked against storage root

### 2. File Type Validation
- Whitelist of allowed file extensions per category
- Dangerous file types (exe, bat, sh, etc.) are blocked

### 3. File Size Limits
- Photos: 5MB maximum
- Documents: 10MB maximum

### 4. Access Control
- Role-based access control (RBAC)
- Students can only access their own documents
- Teachers can access documents in their department
- Admins have full access

### 5. Audit Logging
- All file access is logged
- Includes user, timestamp, IP address, and action

## Maintenance Tasks

### Check Storage Stats
```bash
python manage.py shell
>>> from utils.structured_file_storage import structured_storage
>>> stats = structured_storage.get_storage_stats()
>>> print(stats)
```

### Verify File Integrity
```python
from apps.documents.models import Document

for doc in Document.objects.filter(status='active'):
    is_valid, message = doc.verify_integrity()
    if not is_valid:
        print(f"Document {doc.id}: {message}")
```

### Clean Up Orphaned Files
```bash
python manage.py manage_files --cleanup
```

## Troubleshooting

### Issue: Migration fails
**Solution:** Run with `--dry-run` first to identify issues
```bash
python manage.py migrate_to_structured_storage --dry-run
```

### Issue: File not found after migration
**Solution:** Check file paths in database match physical files
```python
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage

doc = Document.objects.get(id='...')
file_info = structured_storage.get_file_info(doc.filePath)
print(file_info)
```

### Issue: Permission denied
**Solution:** Check file system permissions
```bash
chmod -R 755 storage/Documents/
```

### Issue: Storage full
**Solution:** Check storage stats and clean up old files
```bash
python manage.py manage_files --stats
python manage.py manage_files --cleanup
```

## Best Practices

1. **Always validate files** before saving
2. **Use transactions** when creating document records
3. **Handle errors gracefully** and log them
4. **Regular backups** of the storage directory
5. **Monitor storage usage** and set up alerts
6. **Clean up orphaned files** periodically
7. **Verify file integrity** regularly
8. **Use bulk operations** for multiple uploads
9. **Implement rate limiting** for uploads
10. **Set up CDN** for file serving in production

## Next Steps

1. Update frontend to use new API endpoints
2. Migrate existing documents
3. Update documentation
4. Train users on new system
5. Monitor and optimize performance
6. Set up automated backups
7. Implement CDN for production

## Support

For issues or questions:
1. Check this guide first
2. Review the design document
3. Check logs for errors
4. Contact system administrator
