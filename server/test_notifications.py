"""
Test script to verify notification system is working
Run with: python manage.py shell < test_notifications.py
"""

from apps.notifications.models import Notification
from apps.authentication.models import User
from apps.students.models import Student
from apps.attendance.models import AttendanceRecord
from apps.notifications.utils import create_attendance_notification, send_bulk_attendance_notifications

print("=" * 60)
print("NOTIFICATION SYSTEM TEST")
print("=" * 60)

# Test 1: Check if notification type exists
print("\n1. Checking notification types...")
from apps.notifications.models import NOTIFICATION_TYPES
types = [t[0] for t in NOTIFICATION_TYPES]
if 'attendance_update' in types:
    print("✓ 'attendance_update' notification type exists")
else:
    print("✗ 'attendance_update' notification type NOT found")
    print(f"Available types: {types}")

# Test 2: Check if we can create a notification
print("\n2. Testing notification creation...")
try:
    # Get a student user
    student_user = User.objects.filter(role__in=['student', 'captain']).first()
    if student_user:
        print(f"✓ Found student user: {student_user.username}")
        
        # Create a test notification
        notification = Notification.objects.create(
            recipient=student_user,
            notification_type='attendance_update',
            title='Test Notification',
            message='This is a test notification',
            data={'test': True},
            status='unread'
        )
        print(f"✓ Created test notification: {notification.id}")
        
        # Clean up
        notification.delete()
        print("✓ Cleaned up test notification")
    else:
        print("✗ No student users found in database")
except Exception as e:
    print(f"✗ Error creating notification: {str(e)}")

# Test 3: Check attendance records
print("\n3. Checking attendance records...")
try:
    recent_records = AttendanceRecord.objects.all()[:5]
    print(f"✓ Found {recent_records.count()} recent attendance records")
    
    for record in recent_records:
        print(f"  - Student: {record.student.fullNameEnglish}, Subject: {record.subject_name}, Date: {record.date}")
except Exception as e:
    print(f"✗ Error checking attendance records: {str(e)}")

# Test 4: Test notification utility function
print("\n4. Testing notification utility functions...")
try:
    from apps.notifications.utils import create_attendance_notification
    print("✓ Notification utility functions imported successfully")
except Exception as e:
    print(f"✗ Error importing utility functions: {str(e)}")

# Test 5: Check notification count
print("\n5. Checking existing notifications...")
try:
    total_notifications = Notification.objects.count()
    unread_notifications = Notification.objects.filter(status='unread').count()
    attendance_notifications = Notification.objects.filter(notification_type='attendance_update').count()
    
    print(f"✓ Total notifications: {total_notifications}")
    print(f"✓ Unread notifications: {unread_notifications}")
    print(f"✓ Attendance notifications: {attendance_notifications}")
except Exception as e:
    print(f"✗ Error checking notifications: {str(e)}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
