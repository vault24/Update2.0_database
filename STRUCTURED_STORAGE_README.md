# Structured Document Storage System

## 📋 Overview

A production-ready, scalable document storage system with hierarchical organization for managing student, teacher, and alumni documents. The system provides secure file storage, organized directory structure, and comprehensive API endpoints.

## 🎯 Key Features

- ✅ **Hierarchical Organization**: Documents organized by type → department → session → shift → student
- ✅ **Standardized Naming**: Consistent file naming across the system
- ✅ **Security**: Path traversal prevention, file type validation, access control
- ✅ **Scalability**: Handles thousands of students efficiently
- ✅ **API-First**: RESTful API for all operations
- ✅ **Migration Tools**: Utilities to migrate existing documents
- ✅ **Audit Logging**: Track all file operations
- ✅ **File Integrity**: SHA256 hashing for verification

## 📁 Storage Structure

```
storage/Documents/
├── Student_Documents/
│   └── computer-technology/
│       └── 2024-2025/
│           └── 1st-shift/
│               └── MdMahadi_SIPI-889900/
│                   ├── photo.jpg
│                   ├── birth_certificate.pdf
│                   ├── nid.pdf
│                   ├── father_nid.pdf
│                   ├── mother_nid.pdf
│                   ├── ssc_marksheet.pdf
│                   ├── ssc_certificate.pdf
│                   ├── transcript.pdf
│                   └── other_documents/
│                       └── medical_certificate.pdf
├── Teacher_Documents/
├── Alumni_Documents/
├── Department_Documents/
└── System_Documents/
```

## 🚀 Quick Start

### 1. Run Setup Script
```bash
cd server
python setup_structured_storage.py
```

### 2. Run Database Migration
```bash
python manage.py migrate documents
```

### 3. Update URL Configuration
Add to `server/slms_core/urls.py`:
```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns ...
    path('api/documents/structured/', include('apps.documents.structured_urls')),
]
```

### 4. Test the System
```bash
# Check storage stats
python manage.py shell
>>> from utils.structured_file_storage import structured_storage
>>> stats = structured_storage.get_storage_stats()
>>> print(stats)
```

## 📚 Documentation

- **[Design Document](DOCUMENT_STORAGE_SYSTEM_DESIGN.md)** - Complete system architecture
- **[Implementation Guide](STRUCTURED_STORAGE_IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation
- **[API Reference](#api-endpoints)** - API documentation below

## 🔌 API Endpoints

### Upload Single Document
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

### Bulk Upload Documents
```http
POST /api/documents/structured/student/bulk-upload/
Content-Type: multipart/form-data

{
  "student_id": "uuid",
  "documents": [
    {"file": <file1>, "document_category": "photo"},
    {"file": <file2>, "document_category": "birth_certificate"}
  ]
}
```

### List Student Documents
```http
GET /api/documents/structured/student/{student_id}/
GET /api/documents/structured/student/{student_id}/?category=photo
```

### Get Specific Document
```http
GET /api/documents/structured/student/{student_id}/{category}/
```

### Delete Document
```http
DELETE /api/documents/structured/student/{student_id}/{category}/
```

### Storage Statistics
```http
GET /api/documents/structured/stats/
```

### Migration Status
```http
GET /api/documents/structured/migration-status/
```

## 📝 Document Categories

| Category | Description | File Types | Max Size |
|----------|-------------|------------|----------|
| `photo` | Student photo | jpg, jpeg, png | 5MB |
| `birth_certificate` | Birth certificate | pdf | 10MB |
| `nid` | National ID | pdf, jpg, jpeg, png | 10MB |
| `father_nid` | Father's NID | pdf, jpg, jpeg, png | 10MB |
| `mother_nid` | Mother's NID | pdf, jpg, jpeg, png | 10MB |
| `ssc_marksheet` | SSC marksheet | pdf | 10MB |
| `ssc_certificate` | SSC certificate | pdf | 10MB |
| `transcript` | Transcript | pdf | 10MB |
| `medical_certificate` | Medical certificate | pdf | 10MB |
| `quota_document` | Quota document | pdf | 10MB |
| `other` | Other documents | pdf, jpg, jpeg, png, doc, docx | 10MB |

## 🔄 Migration

### Migrate Existing Documents

```bash
# Dry run (no changes)
python manage.py migrate_to_structured_storage --dry-run

# Migrate student documents
python manage.py migrate_to_structured_storage --document-type=student

# Migrate all documents
python manage.py migrate_to_structured_storage --document-type=all

# Migrate in batches
python manage.py migrate_to_structured_storage --batch-size=50
```

## 🔒 Security Features

### 1. Path Traversal Prevention
All file paths are validated to prevent directory traversal attacks.

### 2. File Type Validation
- Whitelist of allowed extensions per category
- Dangerous file types blocked (exe, bat, sh, etc.)

### 3. File Size Limits
- Photos: 5MB maximum
- Documents: 10MB maximum

### 4. Access Control
- Role-based access control (RBAC)
- Students: Own documents only
- Teachers: Department documents
- Admins: Full access

### 5. Audit Logging
All file operations are logged with user, timestamp, and IP address.

## 💻 Usage Examples

### Python/Django

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

# List documents
documents = structured_storage.list_student_documents(student_data)

# Get storage stats
stats = structured_storage.get_storage_stats()
```

### JavaScript/React

```javascript
// Upload document
const uploadDocument = async (studentId, file, category) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('student_id', studentId);
  formData.append('document_category', category);
  
  const response = await fetch('/api/documents/structured/student/upload/', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  
  return await response.json();
};

// List documents
const listDocuments = async (studentId) => {
  const response = await fetch(
    `/api/documents/structured/student/${studentId}/`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  return await response.json();
};
```

## 🛠️ Maintenance

### Check Storage Stats
```bash
python manage.py shell
>>> from utils.structured_file_storage import structured_storage
>>> stats = structured_storage.get_storage_stats()
>>> print(f"Total: {stats['total_size_mb']:.2f} MB")
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

## 📊 Monitoring

### Key Metrics
- Total storage used
- Documents per student
- Upload/download frequency
- Failed access attempts
- Orphaned files count

### Health Checks
```bash
# Storage stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/documents/structured/stats/

# Migration status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/documents/structured/migration-status/
```

## 🐛 Troubleshooting

### Issue: Migration fails
```bash
# Run dry-run first
python manage.py migrate_to_structured_storage --dry-run
```

### Issue: File not found
```python
# Check file info
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage

doc = Document.objects.get(id='...')
file_info = structured_storage.get_file_info(doc.filePath)
print(file_info)
```

### Issue: Permission denied
```bash
# Fix permissions
chmod -R 755 storage/Documents/
```

## 📦 Files Created

### Core System
- `server/utils/structured_file_storage.py` - Storage service
- `server/apps/documents/structured_serializers.py` - API serializers
- `server/apps/documents/structured_views.py` - API views
- `server/apps/documents/structured_urls.py` - URL routing

### Database
- `server/apps/documents/migrations/0003_add_structured_storage_fields.py` - Migration
- Updated `server/apps/documents/models.py` - Model fields

### Utilities
- `server/apps/documents/management/commands/migrate_to_structured_storage.py` - Migration tool
- `server/setup_structured_storage.py` - Setup script

### Documentation
- `DOCUMENT_STORAGE_SYSTEM_DESIGN.md` - System design
- `STRUCTURED_STORAGE_IMPLEMENTATION_GUIDE.md` - Implementation guide
- `STRUCTURED_STORAGE_README.md` - This file

## 🎓 Best Practices

1. ✅ Always validate files before saving
2. ✅ Use transactions when creating document records
3. ✅ Handle errors gracefully and log them
4. ✅ Regular backups of storage directory
5. ✅ Monitor storage usage
6. ✅ Clean up orphaned files periodically
7. ✅ Verify file integrity regularly
8. ✅ Use bulk operations for multiple uploads
9. ✅ Implement rate limiting for uploads
10. ✅ Set up CDN for file serving in production

## 🚀 Production Deployment

### 1. Environment Variables
```bash
STRUCTURED_STORAGE_ROOT=/var/www/slms/storage/Documents
FILE_STORAGE_URL=/files/
```

### 2. Web Server Configuration (Nginx)
```nginx
location /files/ {
    alias /var/www/slms/storage/Documents/;
    internal;
}
```

### 3. Backup Strategy
```bash
# Daily backup
rsync -av /var/www/slms/storage/Documents/ /backup/documents/$(date +%Y%m%d)/
```

### 4. Monitoring
- Set up alerts for storage usage > 80%
- Monitor failed upload attempts
- Track file integrity check failures

## 📞 Support

For issues or questions:
1. Check the [Implementation Guide](STRUCTURED_STORAGE_IMPLEMENTATION_GUIDE.md)
2. Review the [Design Document](DOCUMENT_STORAGE_SYSTEM_DESIGN.md)
3. Check application logs
4. Contact system administrator

## 📄 License

This system is part of the SLMS project.

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Status:** Production Ready ✅
