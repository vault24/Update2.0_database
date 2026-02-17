# Attendance Complete Flow - Testing Guide

## Test Scenario: Complete Attendance Flow

### Prerequisites
1. Backend server running
2. Frontend running
3. Logged in as a teacher with active class routines
4. At least 2 students in the class

### Step-by-Step Test

#### 1. Initial State Check
- [ ] Open Teacher Attendance page
- [ ] Verify "Take" tab is active
- [ ] Check that today's routines are listed
- [ ] Note which routines show "Complete" badge (if any)

#### 2. Take Attendance
- [ ] Select a routine that is NOT complete
- [ ] Click "Load Students"
- [ ] Verify students list appears
- [ ] Mark attendance for all students (mix of Present/Absent)
- [ ] Verify the percentage counter updates
- [ ] Click "Submit Attendance"

#### 3. Verify Immediate UI Updates
- [ ] Success toast appears: "Attendance submitted successfully!"
- [ ] Returns to setup step automatically
- [ ] The submitted routine now shows "Complete" badge
- [ ] The "Complete" badge persists (doesn't disappear)

#### 4. Check History Section
- [ ] Switch to "History" tab
- [ ] Find the subject you just submitted attendance for
- [ ] Verify "Total Classes" count has increased by 1
- [ ] Expand the subject to see student list
- [ ] Verify students show correct Present/Absent counts
- [ ] Verify percentages are calculated correctly

#### 5. Check Notifications (Student Side)
- [ ] Log out from teacher account
- [ ] Log in as one of the students
- [ ] Click the bell icon (notifications)
- [ ] Verify attendance notification appears
- [ ] Notification should show:
  - Title: "✓ Marked Present" or "✗ Marked Absent"
  - Subject name and date
  - Status: unread

#### 6. Verify Data Persistence
- [ ] Log back in as teacher
- [ ] Go to Teacher Attendance page
- [ ] Verify the routine still shows as "Complete"
- [ ] Switch to History tab
- [ ] Verify the Total Classes count is still correct
- [ ] Verify student attendance data is still there

### Expected Backend Console Output

When submitting attendance:
```
=== BULK CREATE REQUEST ===
Request data: {records: [...], class_routine_id: '...'}
Request user: <teacher_user>
Records count: 2
Routine ID: <uuid>

--- Processing record 1 ---
Record data: {...}
Added routine: <ClassRoutine>
Processed data: {...}
Creating new record
Created record: <uuid>

--- Processing record 2 ---
...

=== SENDING NOTIFICATIONS ===
Attempting to send notifications for 2 records
  Processing notification 1/2
    Student ID: <uuid>
    Found user by related_profile_id: <username>
    ✓ Notification created: 1
  Processing notification 2/2
    ...
    ✓ Notification created: 2
Total notifications created: 2

=== CREATED RECORDS SUMMARY ===
Record <uuid>: student=<id>, subject=<code>, date=2026-02-17, status=direct, class_routine=<uuid>
Record <uuid>: student=<id>, subject=<code>, date=2026-02-17, status=direct, class_routine=<uuid>
```

When fetching history:
```
=== TEACHER SUBJECT SUMMARY REQUEST ===
Teacher ID: <uuid>
Found 3 active routines
Grouped into 2 subjects

Found 4 attendance records

Classes per subject:
  - 3535: 2 classes
  - 787: 1 class
```

### Common Issues and Solutions

#### Issue 1: Routine shows as incomplete after submission
**Symptoms**: After submitting attendance, the routine briefly shows "Complete" but then becomes incomplete again.

**Cause**: Race condition - the routine list is refreshed before the database transaction completes.

**Solution**: The fix adds:
1. Immediate UI update (adds routine to completedIds)
2. 500ms delay before refreshing routine list
3. Ensures database has time to commit

#### Issue 2: History section doesn't update
**Symptoms**: Total Classes count doesn't increase after submission.

**Cause**: History data not being refreshed after submission.

**Solution**: The fix calls `fetchHistory()` immediately after successful submission, before refreshing routines.

#### Issue 3: Notifications not received
**Symptoms**: Students don't see attendance notifications.

**Cause**: Date field in notification data was not JSON serializable.

**Solution**: Convert date to string: `'date': str(attendance_record.date)`

### Debugging Commands

If issues persist, run these commands:

1. **Test attendance flow**:
```bash
cd server
python manage.py test_attendance_flow
```

2. **Check database directly**:
```bash
cd server
python manage.py shell
```
```python
from apps.attendance.models import AttendanceRecord
from datetime import date

# Check today's records
today = date.today()
records = AttendanceRecord.objects.filter(date=today, status='direct')
print(f"Found {records.count()} records for today")

for record in records:
    print(f"  - {record.student.fullNameEnglish}: {record.subject_code} - {'Present' if record.is_present else 'Absent'}")
    print(f"    Class Routine: {record.class_routine_id}")
    print(f"    Status: {record.status}")
```

3. **Check notifications**:
```python
from apps.notifications.models import Notification
from datetime import datetime, timedelta

# Check recent notifications
recent = Notification.objects.filter(
    created_at__gte=datetime.now() - timedelta(hours=1),
    notification_type='attendance_update'
)
print(f"Found {recent.count()} recent attendance notifications")

for notif in recent:
    print(f"  - To: {notif.recipient.username}")
    print(f"    Title: {notif.title}")
    print(f"    Status: {notif.status}")
```

### Success Criteria

All of the following must be true:
- ✅ Attendance submission succeeds without errors
- ✅ Routine shows "Complete" badge and stays complete
- ✅ History section Total Classes increments correctly
- ✅ Student attendance data appears in History
- ✅ Students receive notifications
- ✅ Data persists after page refresh
- ✅ Backend logs show successful record creation
- ✅ Backend logs show successful notification creation

### Performance Notes

- Attendance submission should complete in < 2 seconds
- History refresh should complete in < 1 second
- Routine list refresh should complete in < 1 second
- Notifications should be created within the same request

### Known Limitations

1. If multiple teachers submit attendance for the same students at the exact same time, there might be a race condition
2. The 500ms delay before refreshing routines is a workaround - ideally we'd use optimistic UI updates
3. Debug logging is verbose and should be removed in production
