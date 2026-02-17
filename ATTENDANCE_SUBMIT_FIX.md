# Attendance Submit 400 Error - Fixed

## Problem
Teacher attendance submission was failing with a 400 Bad Request error when calling `POST /api/attendance/bulk_create/`.

## Root Causes Identified

### 1. Missing Request Context
The `bulk_create` view was not passing the request context to the serializer, which meant nested serializers couldn't access `request.user` for auto-assignment.

### 2. Insufficient Error Logging
The view was using `raise_exception=True` which didn't provide detailed error information for debugging.

### 3. Missing Fallback for `recorded_by`
The view wasn't explicitly setting `recorded_by` to the current user when processing individual records.

## Fixes Applied

### 1. Updated `bulk_create` View (views.py)
- Added request context when initializing serializer: `context={'request': request}`
- Added comprehensive debug logging to track request data and validation errors
- Changed from `raise_exception=True` to explicit error handling with detailed response
- Added explicit `recorded_by` assignment in the loop as a fallback

```python
serializer = self.get_serializer(data=request.data, context={'request': request})

if not serializer.is_valid():
    print(f"Serializer validation errors: {serializer.errors}")
    return Response(
        {'error': 'Validation failed', 'details': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST
    )

# In the loop:
if 'recorded_by' not in record_data or record_data['recorded_by'] is None:
    record_data['recorded_by'] = request.user
```

### 2. Updated `AttendanceCreateSerializer` (serializers.py)
- Made `recorded_by`, `notes`, and `status` optional using `extra_kwargs`
- Added auto-assignment logic in the `create` method to set `recorded_by` to current user if not provided
- The ModelSerializer automatically handles ForeignKey fields and accepts UUID primary keys

```python
extra_kwargs = {
    'recorded_by': {'required': False, 'allow_null': True},
    'notes': {'required': False, 'allow_blank': True, 'allow_null': True},
    'status': {'required': False},
}

def create(self, validated_data):
    # Set recorded_by to current user if not provided
    if 'recorded_by' not in validated_data or validated_data['recorded_by'] is None:
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['recorded_by'] = request.user
    
    return super().create(validated_data)
```

### 3. Updated `BulkAttendanceCreateSerializer` (serializers.py)
- Added `validate_records` method to ensure context is passed to nested serializers

## How It Works Now

1. Frontend sends attendance records with `recorded_by` as a UUID string (or omits it)
2. Backend serializer validates the data
3. If `recorded_by` is not provided or is null:
   - First, the serializer's `create` method tries to assign `request.user`
   - Second, the view's loop also assigns `request.user` as a fallback
4. Detailed error logging helps identify any validation issues
5. Records are created or updated successfully

## Testing

To test the fix:

1. Start the backend server: `cd server && python manage.py runserver`
2. Log in as a teacher in the frontend
3. Navigate to Teacher Attendance page
4. Select a class routine and date
5. Mark attendance for students
6. Click "Submit Attendance"
7. Check the backend console for debug logs showing:
   - Request data received
   - Validation status
   - Record processing details
8. Verify attendance records are created successfully

## Debug Logs

The backend now logs detailed information:
```
=== BULK CREATE REQUEST ===
Request data: {...}
Request user: <User object>
User ID: <uuid>
Validated records count: X
Routine ID: <uuid>

--- Processing record 1 ---
Record data: {...}
Added routine: <ClassRoutine object>
Set recorded_by to: <User object>
Creating new record
Created record: <uuid>
```

## Files Modified

- `server/apps/attendance/views.py` - Added context, logging, and error handling
- `server/apps/attendance/serializers.py` - Made fields optional and added auto-assignment

## Expected Behavior

- Attendance submission should now work without 400 errors
- Backend logs will show detailed information about the request and validation
- Teachers can successfully submit attendance for their classes
- Students will receive notifications about their attendance status
- The `recorded_by` field is automatically set to the current user if not provided
