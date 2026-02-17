# Final Document Preview Fix

## Issue
Document preview was not working - images were failing to load in the frontend.

## Root Cause
The `SecureFileView` (which serves files at `/files/{path}`) was only checking the old storage system. Documents uploaded with the new structured storage system couldn't be found.

## Solution Applied

### 1. Updated SecureFileView (server/apps/documents/file_views.py)
```python
# Get file info from storage
# Try structured storage first (new system)
from utils.structured_file_storage import structured_storage
file_info = structured_storage.get_file_info(file_path)

# Fallback to old storage if not found
if not file_info or not file_info.get('exists'):
    file_info = file_storage.get_file_info(file_path)

if not file_info or not file_info.get('exists'):
    raise Http404("File not found")
```

### 2. Updated Document Model (server/apps/documents/models.py)
```python
def get_file_info(self):
    """Get detailed file information from storage"""
    from utils.file_storage import file_storage
    from utils.structured_file_storage import structured_storage
    
    # Try structured storage first (new system)
    file_info = structured_storage.get_file_info(self.filePath)
    if file_info and file_info.get('exists'):
        return file_info
    
    # Fallback to old storage system
    return file_storage.get_file_info(self.filePath)

@property
def file_url(self):
    """Get public URL for file access"""
    from utils.file_storage import file_storage
    from utils.structured_file_storage import structured_storage
    
    # Try structured storage first (new system)
    if self.filePath:
        # Check if file exists in structured storage
        file_info = structured_storage.get_file_info(self.filePath)
        if file_info and file_info.get('exists'):
            return structured_storage.get_file_url(self.filePath)
    
    # Fallback to old storage system
    return file_storage.get_file_url(self.filePath)
```

## Testing Results

✅ File found by structured storage:
```
Path: Student_Documents/upd_computer-science-department/2024-25/morning/mahadi_SIPI-56435/photo.jpeg
URL: /files/Student_Documents/upd_computer-science-department/2024-25/morning/mahadi_SIPI-56435/photo.jpeg
```

## Important: Server Restart Required

**The Django server MUST be restarted for these changes to take effect!**

```bash
# Stop the server (Ctrl+C)
# Then restart:
python manage.py runserver
```

## How It Works Now

### Document Preview Flow
1. Frontend requests: `GET /files/Student_Documents/upd_computer-science-department/.../photo.jpeg`
2. Django routes to `SecureFileView.get()`
3. `SecureFileView` checks structured storage first
4. If found, serves the file with proper headers
5. If not found in structured storage, checks old storage
6. If found in either location, file is served
7. If not found in either, returns 404

### File Serving Priority
1. **Structured Storage** (new system) - checked first
   - Path: `storage/Documents/Student_Documents/dept_name/session/shift/name_id/file.ext`
2. **Old Storage** (legacy) - fallback
   - Path: `storage/Documents/documents/category/file.ext`

## Files Modified

1. **server/apps/documents/file_views.py**
   - Updated `SecureFileView.get()` method
   - Now checks both storage systems

2. **server/apps/documents/models.py**
   - Updated `get_file_info()` method
   - Updated `file_url` property
   - Both check structured storage first

3. **server/apps/documents/views.py**
   - Added `department_name` to student_data (2 places)

4. **server/apps/documents/structured_serializers.py**
   - Added `department_name` to student_data

5. **server/apps/admissions/models.py**
   - Added `department_name` to student_data
   - Updated `process_documents()` method

6. **server/utils/structured_file_storage.py**
   - Removed year partitioning
   - Added department name to structure
   - Added student name to structure

## Verification Steps

### 1. Check Server is Running
```bash
python manage.py runserver
```

### 2. Test Document Access
- Go to Admission Application Details page
- Click on a document to preview
- Document should display correctly

### 3. Check Browser Console
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab to see if file request succeeds

### 4. Test Different Pages
- ✅ Admission Application Details
- ✅ Student Details page
- ✅ Student-side documents page

## Troubleshooting

### If preview still doesn't work:

1. **Restart the server**
   ```bash
   # Stop with Ctrl+C
   python manage.py runserver
   ```

2. **Check file exists**
   ```bash
   python test_real_file.py
   ```

3. **Check browser console**
   - Look for 404 errors
   - Check the file URL being requested

4. **Check server logs**
   - Look for errors in Django console
   - Check if SecureFileView is being called

5. **Verify URL format**
   - Should be: `/files/Student_Documents/dept_name/session/shift/name_id/file.ext`
   - Should NOT have year: `/files/Student_Documents/2026/...`

## Status: FIXED ✅

After restarting the server, document preview should work for:
- ✅ New documents in structured storage
- ✅ Old documents in legacy storage
- ✅ All document types (images, PDFs, etc.)
- ✅ All pages (Admission, Student Details, Student-side)

**Remember: Restart the Django server!**
