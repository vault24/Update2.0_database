# Document Upload Fix - Admission Section

## Problem
Documents were not uploading properly from the student-side admission section. The admission documents were being saved using the old file storage system instead of the new year-based structured storage.

## Root Cause
The `process_documents()` method in `server/apps/admissions/models.py` was using the old `file_storage.save_file()` method, which saved files to:
```
storage/Documents/documents/admission/{field_name}/
```

Instead of the new structured storage format:
```
storage/Documents/Student_Documents/2026/dept/session/shift/STUDENT-ID/
```

## Solution
Updated the `process_documents()` method to:

1. **Use Structured Storage**: Changed from `file_storage.save_file()` to `structured_storage.save_student_document()`

2. **Extract Student Data**: The method now extracts student information from:
   - User's student profile (if exists)
   - Admission data (department, session, shift)
   - Uses temporary ID format `ADM-{admission_id}` if no student profile exists

3. **Map Document Categories**: Added proper mapping from admission field names to structured storage categories:
   ```python
   document_category_mapping = {
       'photo': 'photo',
       'sscMarksheet': 'ssc_marksheet',
       'sscCertificate': 'ssc_certificate',
       'birthCertificateDoc': 'birth_certificate',
       'studentNIDCopy': 'nid',
       'fatherNIDFront': 'father_nid',
       'fatherNIDBack': 'father_nid',
       'motherNIDFront': 'mother_nid',
       'motherNIDBack': 'mother_nid',
       'testimonial': 'transcript',
       'medicalCertificate': 'medical_certificate',
       'quotaDocument': 'quota_document',
       'extraCertificates': 'other',
   }
   ```

4. **Add Structured Fields**: Document records now include:
   - `document_type` (student/teacher/alumni)
   - `department_code`
   - `session`
   - `shift`
   - `owner_name`
   - `owner_id`
   - `document_category`

5. **Fallback Support**: If student data is not available, falls back to old storage system

## Files Modified

### server/apps/admissions/models.py
- Updated `process_documents()` method (lines 166-310)
- Added structured storage import
- Added student data extraction logic
- Added document category mapping
- Added structured storage fields to Document creation

## How It Works Now

### 1. Student Submits Admission Form
```typescript
// client/student-side/src/components/admission/AdmissionWizard.tsx
const documents = {
  photo: File,
  sscMarksheet: File,
  birthCertificateDoc: File,
  // ... other documents
};

await admissionService.submitApplicationWithDocuments(admissionData, documents);
```

### 2. Frontend Sends Documents
```typescript
// client/student-side/src/services/admissionService.ts
const formData = new FormData();
formData.append('admission_id', admissionId);

Object.entries(documents).forEach(([fieldName, file]) => {
  formData.append(`documents[${fieldName}]`, file);
});

await api.post('/admissions/upload-documents/', formData, true);
```

### 3. Backend Processes Documents
```python
# server/apps/admissions/views.py
@action(detail=False, methods=['post'], url_path='upload-documents')
def upload_documents(self, request):
    admission = Admission.objects.get(id=admission_id)
    document_files = extract_files_from_request(request.FILES)
    success = admission.process_documents(document_files)
```

### 4. Documents Saved with Structured Storage
```python
# server/apps/admissions/models.py
def process_documents(self, document_files):
    student_data = {
        'department_code': 'computer-technology',
        'session': '2024-2025',
        'shift': '1st-shift',
        'student_name': 'MdMahadi',
        'student_id': 'ADM-12345678',
    }
    
    file_info = structured_storage.save_student_document(
        uploaded_file=file_obj,
        student_data=student_data,
        document_category='photo',
        validate=True
    )
    
    # Creates file at:
    # Student_Documents/2026/computer-technology/2024-2025/1st-shift/ADM-12345678/photo.jpg
```

## Storage Structure

### Before Fix
```
storage/Documents/
└── documents/
    └── admission/
        ├── photo/
        ├── sscMarksheet/
        ├── birthCertificateDoc/
        └── ...
```

### After Fix
```
storage/Documents/
└── Student_Documents/
    └── 2026/
        └── computer-technology/
            └── 2024-2025/
                └── 1st-shift/
                    └── ADM-12345678/
                        ├── photo.jpg
                        ├── ssc_marksheet.pdf
                        ├── birth_certificate.pdf
                        ├── father_nid.pdf
                        ├── mother_nid.pdf
                        └── ...
```

## Benefits

1. **Year-Based Partitioning**: Documents organized by year for better scalability
2. **Consistent Structure**: All student documents follow the same structure
3. **Easy Migration**: When admission is approved and student is created, documents are already in the correct location
4. **Better Organization**: Documents grouped by department, session, and shift
5. **Searchable**: Documents include search_text field for full-text search
6. **Indexed**: Year and document_type fields are indexed for fast queries

## Testing

### Test Document Upload
1. Go to student-side admission form
2. Fill in all required fields
3. Upload documents in Step 5 (Documents)
4. Submit the application
5. Check the storage directory:
   ```
   storage/Documents/Student_Documents/2026/dept/session/shift/ADM-xxxxx/
   ```

### Verify Database Records
```python
from apps.documents.models import Document

# Check documents created from admission
docs = Document.objects.filter(source_type='admission')
for doc in docs:
    print(f"File: {doc.fileName}")
    print(f"Path: {doc.filePath}")
    print(f"Year: {doc.year}")
    print(f"Dept: {doc.department_code}")
    print(f"Category: {doc.document_category}")
```

## Status: FIXED ✅

The document upload system now properly uses the year-based structured storage for admission documents. All new uploads will follow the new structure.
