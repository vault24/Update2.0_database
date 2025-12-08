"""
Integration helpers for creating notifications from other apps
"""

from django.contrib.auth.models import User
from .services import NotificationService


def notify_application_status_change(application, new_status):
    """
    Create notification when application status changes
    
    Args:
        application: Application object
        new_status: New status value
    """
    try:
        recipient = application.applicant if hasattr(application, 'applicant') else application.user
        
        status_labels = {
            'pending': 'Your application is pending review',
            'approved': 'Your application has been approved!',
            'rejected': 'Your application has been rejected',
            'under_review': 'Your application is under review'
        }
        
        title = f"Application Status Update"
        message = status_labels.get(new_status, f"Your application status changed to {new_status}")
        
        NotificationService.create_notification(
            recipient=recipient,
            notification_type='application_status',
            title=title,
            message=message,
            data={
                'application_id': application.id,
                'status': new_status
            }
        )
    except Exception as e:
        print(f"Error creating application status notification: {e}")


def notify_document_approval(document, approved):
    """
    Create notification when document is approved or rejected
    
    Args:
        document: Document object
        approved: Boolean indicating if approved
    """
    try:
        recipient = document.student if hasattr(document, 'student') else document.user
        
        title = "Document Approval"
        message = "Your document has been approved" if approved else "Your document has been rejected"
        
        NotificationService.create_notification(
            recipient=recipient,
            notification_type='document_approval',
            title=title,
            message=message,
            data={
                'document_id': document.id,
                'approved': approved
            }
        )
    except Exception as e:
        print(f"Error creating document approval notification: {e}")


def notify_student_admission(student, admitted):
    """
    Create notification when student is admitted or rejected
    
    Args:
        student: Student object
        admitted: Boolean indicating if admitted
    """
    try:
        recipient = student.user if hasattr(student, 'user') else student
        
        title = "Admission Decision"
        message = "Congratulations! You have been admitted." if admitted else "We regret to inform you that you were not admitted."
        
        NotificationService.create_notification(
            recipient=recipient,
            notification_type='student_admission',
            title=title,
            message=message,
            data={
                'student_id': student.id if hasattr(student, 'id') else None,
                'admitted': admitted
            }
        )
    except Exception as e:
        print(f"Error creating admission notification: {e}")


def notify_system_announcement(title, message, user_group=None):
    """
    Create system announcement notification
    
    Args:
        title: Announcement title
        message: Announcement message
        user_group: QuerySet of users to notify (default: all users)
    """
    try:
        if user_group is None:
            user_group = User.objects.filter(is_active=True)
        
        NotificationService.create_announcement(
            title=title,
            message=message,
            user_group=user_group,
            notification_type='system_announcement'
        )
    except Exception as e:
        print(f"Error creating system announcement: {e}")


def notify_deadline_reminder(user, deadline_title, deadline_date):
    """
    Create deadline reminder notification
    
    Args:
        user: User object
        deadline_title: Title of the deadline
        deadline_date: Date of the deadline
    """
    try:
        title = f"Deadline Reminder: {deadline_title}"
        message = f"Reminder: {deadline_title} is due on {deadline_date}"
        
        NotificationService.create_notification(
            recipient=user,
            notification_type='deadline_reminder',
            title=title,
            message=message,
            data={
                'deadline_title': deadline_title,
                'deadline_date': str(deadline_date)
            }
        )
    except Exception as e:
        print(f"Error creating deadline reminder: {e}")


def notify_account_activity(user, activity_type, activity_description):
    """
    Create account activity notification
    
    Args:
        user: User object
        activity_type: Type of activity
        activity_description: Description of the activity
    """
    try:
        title = f"Account Activity: {activity_type}"
        message = activity_description
        
        NotificationService.create_notification(
            recipient=user,
            notification_type='account_activity',
            title=title,
            message=message,
            data={
                'activity_type': activity_type
            }
        )
    except Exception as e:
        print(f"Error creating account activity notification: {e}")
