# Notification System Testing Guide

## Pre-requisites

1. **Database Migration**
   ```bash
   cd server
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **Verify Notification Type**
   - Check that 'attendance_update' is in `NOTIFICATION_TYPES`
   - File: `server/apps/notifications/models.py`

## Backend Testing

### 1. Run Test Script
```bash
cd server
python manage.py shell < test_notifications.py
```

Expected output:
```
✓ 'attendance_update' notification type exists
✓ Found student user: [username]
✓ Created test notification: [id]
✓ Cleaned up test notification
✓ Found X recent attendance records
✓ Notification utility functions imported successfully
✓ Total notifications: X
✓ Unread notifications: X
✓ Attendance notifications: X
```

### 2. Test API Endpoints

#### Get Notifications
```bash
curl -X GET http://localhost:8000/api/notifications/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Unread Count
```bash
curl -X GET http://localhost:8000/api/notifications/unread_count/
```

#### Mark as Read
```bash
curl -X POST http://localhost:8000/api/notifications/{id}/mark_as_read/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Mark All as Read
```bash
curl -X POST http://localhost:8000/api/notifications/mark_all_as_read/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Notification Creation

#### Manual Test in Django Shell
```python
python manage.py shell

from apps.notifications.models import Notification
from apps.authentication.models import User

# Get a student user
student = User.objects.filter(role='student').first()

# Create notification
notification = Notification.objects.create(
    recipient=student,
    notification_type='attendance_update',
    title='Test: Marked Present',
    message='You have been marked present for Mathematics.',
    data={
        'subject_name': 'Mathematics',
        'date': '2024-01-15',
        'is_present': True
    },
    status='unread'
)

print(f"Created notification: {notification.id}")
```

### 4. Test Attendance Integration

#### Mark Attendance (Should Create Notifications)
```python
python manage.py shell

from apps.attendance.models import AttendanceRecord
from apps.students.models import Student
from apps.authentication.models import User

# Get a student
student = Student.objects.first()

# Create attendance record
record = AttendanceRecord.objects.create(
    student=student,
    subject_code='MATH101',
    subject_name='Mathematics',
    semester=1,
    date='2024-01-15',
    is_present=True,
    status='direct'
)

# Check if notification was created
student_user = User.objects.filter(
    related_profile_id=student.id,
    role__in=['student', 'captain']
).first()

if student_user:
    notifications = Notification.objects.filter(
        recipient=student_user,
        notification_type='attendance_update'
    )
    print(f"Notifications created: {notifications.count()}")
```

## Frontend Testing

### 1. Check Notifications Page

1. **Login as Student**
   - Navigate to student dashboard
   - Click bell icon (🔔) in header
   - Should navigate to `/dashboard/notifications`

2. **Verify Page Loads**
   - Check for loading spinner
   - Verify tabs appear (All, Unread, Attendance)
   - Check for empty state or notifications

3. **Test Filters**
   - Click "All" tab - should show all notifications
   - Click "Unread" tab - should show only unread
   - Click "Attendance" tab - should show only attendance notifications

### 2. Test Notification Actions

1. **Mark as Read**
   - Click "Mark read" button on unread notification
   - Notification should update (remove "New" badge)
   - Unread count should decrease

2. **Mark All as Read**
   - Click "Mark all as read" button
   - All notifications should be marked as read
   - Unread count should become 0

3. **Archive**
   - Click archive button (📦)
   - Notification should disappear from list

4. **Delete**
   - Click delete button (🗑️)
   - Notification should be removed

### 3. Test Notification Creation Flow

#### Complete Flow Test:

1. **As Teacher:**
   - Go to Teacher Attendance page
   - Mark attendance for students
   - Submit attendance

2. **As Student:**
   - Check bell icon - should show unread count
   - Click bell icon
   - Should see new attendance notification
   - Notification should show:
     - Title: "✓ Marked Present" or "✗ Marked Absent"
     - Subject name
     - Date
     - Status badge

3. **Test Status Update:**
   - As Teacher: Change student status in Pending tab
   - As Student: Should receive "Attendance Updated" notification

4. **Test Approval:**
   - As Captain: Submit attendance
   - As Teacher: Approve submission
   - As Student: Should receive "Attendance Approved" notification

5. **Test Rejection:**
   - As Captain: Submit attendance
   - As Teacher: Reject submission
   - As Student: Should receive "Attendance Rejected" notification

## Troubleshooting

### Issue: No notifications appearing

**Check:**
1. Database migration completed?
   ```bash
   python manage.py showmigrations notifications
   ```

2. Notification type exists?
   ```python
   from apps.notifications.models import NOTIFICATION_TYPES
   print([t[0] for t in NOTIFICATION_TYPES])
   ```

3. Student has user account?
   ```python
   from apps.authentication.models import User
   from apps.students.models import Student
   
   student = Student.objects.first()
   user = User.objects.filter(related_profile_id=student.id).first()
   print(f"Student user: {user}")
   ```

### Issue: API returns 404

**Check:**
1. URLs registered?
   ```python
   python manage.py show_urls | grep notification
   ```

2. Authentication working?
   - Check if user is logged in
   - Verify token/session is valid

### Issue: Notifications created but not showing

**Check:**
1. Recipient is correct?
   ```python
   notification = Notification.objects.last()
   print(f"Recipient: {notification.recipient}")
   print(f"Current user: {request.user}")
   ```

2. Status filter working?
   - Try accessing `/api/notifications/?status=unread`
   - Try accessing `/api/notifications/` (all)

### Issue: Bell icon not showing count

**Check:**
1. Unread count endpoint working?
   ```bash
   curl http://localhost:8000/api/notifications/unread_count/
   ```

2. DashboardLayout fetching count?
   - Check browser console for errors
   - Verify API call is being made

## Success Criteria

✅ Database migrations applied
✅ Test script passes all checks
✅ API endpoints return data
✅ Notifications page loads
✅ Tabs filter correctly
✅ Actions work (mark read, archive, delete)
✅ Bell icon shows unread count
✅ Notifications created when attendance marked
✅ Notifications created when status updated
✅ Notifications created when approved/rejected

## Common Issues and Solutions

### 1. "attendance_update not in NOTIFICATION_TYPES"
**Solution:** Add to `server/apps/notifications/models.py`:
```python
NOTIFICATION_TYPES = [
    # ... existing types
    ('attendance_update', 'Attendance Update'),
]
```

### 2. "No student user found"
**Solution:** Ensure students have user accounts with `related_profile_id` set

### 3. "Notifications not appearing in frontend"
**Solution:** 
- Check browser console for errors
- Verify API endpoint URL is correct
- Check authentication token is valid

### 4. "Bell icon not updating"
**Solution:**
- Refresh the page
- Check if unread_count endpoint is being called
- Verify response format matches expected structure

## Manual Verification Checklist

- [ ] Run database migrations
- [ ] Run test script successfully
- [ ] Create test notification manually
- [ ] Verify notification appears in database
- [ ] Access notifications page as student
- [ ] See test notification in UI
- [ ] Mark notification as read
- [ ] Archive notification
- [ ] Delete notification
- [ ] Mark attendance as teacher
- [ ] Verify student receives notification
- [ ] Update attendance status
- [ ] Verify student receives update notification
- [ ] Approve captain submission
- [ ] Verify students receive approval notifications
- [ ] Reject captain submission
- [ ] Verify students receive rejection notifications

## Next Steps

After all tests pass:
1. Test with real users
2. Monitor notification creation in production
3. Check notification delivery logs
4. Gather user feedback
5. Optimize performance if needed
