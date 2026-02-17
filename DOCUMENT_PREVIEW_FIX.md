# Document Preview Fix

## Issue
Document preview was not working properly because the file serving view (`SecureFileView`) was only checking the old storage system and not the new structured storage.

## Root Cause
The `SecureFileView` in `server/apps/documents/file_views.py` was using:
```python
file_info = file_storage.get_file_info(file_path)
```

This only checked the old storage system at paths like:
```
storage/Documents/documents/admission/photo/...
```

But documents uploaded with the new system are stored at:
```
storage/Documents/Student_Documents/85_computer-science/2024-2025/1st-shift/Name_ID/...
```

## Solution
Updated `SecureFileView.get()` method to check both storage systems:

```python
# Try structured storage first (new system)
from utils.structured_file_storage import structured_storage
file_info = structured_storage.get_file_info(file_path)

# Fallback to old storage if not found
if not file_info or not file_info.get('exists'):
    file_info = file_storage.get_file_info(file_path)

if not file_info or not file_info.get('exists'):
    raise Http404("File not found")
```

## Files Modified

### server/apps/documents/file_views.py
- Updated `SecureFileView.get()` method (line ~36)
- Now checks structured storage first, then falls back to old storage
- Ensures all documents can be previewed and downloaded

## How It Works Now

### Document Preview Flow
1. Frontend requests: `GET /files/Student_Documents/85_computer-science/.../photo.jpg`
2. `SecureFileView` receives the request
3. Checks structured storage first
4. If not found, checks old storage
5. If found, serves the file with proper headers
6. Logs the access attempt

### Backward Compatibility
- Old documents in old storage: ✅ Still work
- New documents in structured storage: ✅ Now work
- Access control: ✅ Still enforced
- Logging: ✅ Still works

## Testing

### Test Document Preview
1. Upload a document through admission
2. Go to Admission Application Details page
3. Click on document to preview
4. Document should display correctly

### Test Document Download
1. Go to Student Details page
2. Click download on any document
3. File should download correctly

### Test Student-Side Documents
1. Login as student
2. Go to documents page
3. Documents should display and be downloadable

## Related Fixes

This fix works together with previous fixes:

1. **Document Model** (`models.py`):
   - `get_file_info()` checks both storages
   - `file_url` property checks both storages

2. **File Serving** (`file_views.py`):
   - `SecureFileView` checks both storages

3. **Storage Structure** (`structured_file_storage.py`):
   - Correct path format without year
   - Department code and name
   - Student name and ID

## Status: FIXED ✅

Document preview and download now work correctly for:
- ✅ Documents in new structured storage
- ✅ Documents in old storage (backward compatible)
- ✅ All pages (Admission Details, Student Details, Student-side)
- ✅ Access control still enforced
- ✅ Access logging still works
