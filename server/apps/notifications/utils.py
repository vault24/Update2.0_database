"""
Notification Utilities
Helper functions for creating and sending notifications
"""
import logging

from .models import Notification

logger = logging.getLogger(__name__)


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

    for record in attendance_records:
        # Get the student's user account
        try:
            student_user = record.student.user if hasattr(record.student, 'user') else None

            # If student doesn't have a direct user relation, try to find by related_profile_id
            if not student_user:
                from apps.authentication.models import User
                student_user = User.objects.filter(
                    related_profile_id=record.student.id,
                    role__in=['student', 'captain']
                ).first()

            if student_user:
                notification = create_attendance_notification(student_user, record, action)
                notifications.append(notification)
            else:
                logger.info("No user account found for student %s", record.student.id)
        except Exception:
            logger.exception("Failed to create attendance notification for student %s", record.student_id)
            continue

    logger.info("Created %d attendance notifications", len(notifications))
    return notifications
