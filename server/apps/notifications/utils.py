"""
Notification Utilities
Helper functions for creating and sending notifications
"""
from .models import Notification


def create_attendance_notification(student_user, attendance_record, action='marked'):
    """
    Create an attendance notification for a student
    
    Args:
        student_user: User object of the student
        attendance_record: AttendanceRecord object
        action: 'marked', 'updated', 'approved', 'rejected'
    """
    # Determine the message based on action and status
    if action == 'marked':
        if attendance_record.is_present:
            title = "✓ Marked Present"
            message = f"You have been marked present for {attendance_record.subject_name} on {attendance_record.date}."
        else:
            title = "✗ Marked Absent"
            message = f"You have been marked absent for {attendance_record.subject_name} on {attendance_record.date}."
    elif action == 'updated':
        if attendance_record.is_present:
            title = "Attendance Updated: Present"
            message = f"Your attendance for {attendance_record.subject_name} on {attendance_record.date} has been updated to Present."
        else:
            title = "Attendance Updated: Absent"
            message = f"Your attendance for {attendance_record.subject_name} on {attendance_record.date} has been updated to Absent."
    elif action == 'approved':
        title = "Attendance Approved"
        message = f"Your attendance for {attendance_record.subject_name} on {attendance_record.date} has been approved by your teacher."
    elif action == 'rejected':
        title = "Attendance Rejected"
        message = f"Your attendance for {attendance_record.subject_name} on {attendance_record.date} has been rejected."
        if attendance_record.rejection_reason:
            message += f" Reason: {attendance_record.rejection_reason}"
    else:
        title = "Attendance Update"
        message = f"Your attendance for {attendance_record.subject_name} on {attendance_record.date} has been updated."
    
    # Create notification data
    data = {
        'attendance_id': str(attendance_record.id),
        'subject_code': attendance_record.subject_code,
        'subject_name': attendance_record.subject_name,
        'date': str(attendance_record.date),  # Convert date to string for JSON serialization
        'is_present': attendance_record.is_present,
        'status': attendance_record.status,
        'action': action,
    }
    
    # Create the notification
    notification = Notification.objects.create(
        recipient=student_user,
        notification_type='attendance_update',
        title=title,
        message=message,
        data=data,
        status='unread'
    )
    
    return notification


def send_bulk_attendance_notifications(attendance_records, action='marked'):
    """
    Send notifications for multiple attendance records
    
    Args:
        attendance_records: List of AttendanceRecord objects
        action: 'marked', 'updated', 'approved', 'rejected'
    """
    notifications = []
    
    print(f"Attempting to send notifications for {len(attendance_records)} records")
    
    for idx, record in enumerate(attendance_records):
        # Get the student's user account
        try:
            print(f"\n  Processing notification {idx + 1}/{len(attendance_records)}")
            print(f"    Student ID: {record.student.id}")
            print(f"    Student Name: {record.student.fullNameEnglish}")
            
            student_user = record.student.user if hasattr(record.student, 'user') else None
            print(f"    Direct user relation: {student_user}")
            
            # If student doesn't have a direct user relation, try to find by related_profile_id
            if not student_user:
                from apps.authentication.models import User
                student_user = User.objects.filter(
                    related_profile_id=record.student.id,
                    role__in=['student', 'captain']
                ).first()
                print(f"    Found user by related_profile_id: {student_user}")
            
            if student_user:
                print(f"    Creating notification for user: {student_user.username} (ID: {student_user.id})")
                notification = create_attendance_notification(student_user, record, action)
                notifications.append(notification)
                print(f"    ✓ Notification created: {notification.id}")
            else:
                print(f"    ✗ No user account found for student {record.student.id}")
        except Exception as e:
            print(f"    ✗ Failed to create notification for student {record.student.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\nTotal notifications created: {len(notifications)}")
    return notifications
