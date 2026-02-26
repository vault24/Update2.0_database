"""
Django signals for creating admin notifications
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.admissions.models import Admission
from apps.applications.models import Application
from apps.correction_requests.models import CorrectionRequest
from apps.authentication.models import SignupRequest
from apps.teacher_requests.models import TeacherSignupRequest
from apps.complaints.models import Complaint
from .services import NotificationService

User = get_user_model()


def get_admin_users():
    """Get all admin/staff users"""
    return User.objects.filter(is_staff=True, is_active=True)


@receiver(post_save, sender=Admission)
def notify_admins_new_admission(sender, instance, created, **kwargs):
    """Notify admins when a new admission is submitted"""
    if created and instance.status == 'pending':
        try:
            admin_users = get_admin_users()
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='student_admission',
                    title='New Admission Request',
                    message=f'{instance.full_name_english} has submitted an admission request for {instance.desired_department.name if instance.desired_department else "a department"}.',
                    data={
                        'admission_id': str(instance.id),
                        'student_name': instance.full_name_english,
                        'department': instance.desired_department.name if instance.desired_department else None,
                        'link': f'/admissions/{instance.id}'
                    }
                )
        except Exception as e:
            print(f"Error creating admission notification: {e}")


@receiver(post_save, sender=Application)
def notify_admins_new_application(sender, instance, created, **kwargs):
    """Notify admins when a new application is submitted"""
    if created and instance.status == 'pending':
        try:
            admin_users = get_admin_users()
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='application_status',
                    title='New Application Submitted',
                    message=f'A new {instance.applicationType} application has been submitted by {instance.fullNameEnglish}.',
                    data={
                        'application_id': str(instance.id),
                        'application_type': instance.applicationType,
                        'student_name': instance.fullNameEnglish,
                        'link': f'/applications'
                    }
                )
        except Exception as e:
            print(f"Error creating application notification: {e}")


@receiver(post_save, sender=CorrectionRequest)
def notify_admins_new_correction_request(sender, instance, created, **kwargs):
    """Notify admins when a new correction request is submitted"""
    if created and instance.status == 'pending':
        try:
            admin_users = get_admin_users()
            student_name = instance.student.fullNameEnglish if instance.student else 'A student'
            
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='application_status',
                    title='New Correction Request',
                    message=f'{student_name} has submitted a correction request for {instance.fieldName}.',
                    data={
                        'correction_request_id': str(instance.id),
                        'field_name': instance.fieldName,
                        'student_name': student_name,
                        'link': f'/correction-requests'
                    }
                )
        except Exception as e:
            print(f"Error creating correction request notification: {e}")


@receiver(post_save, sender=SignupRequest)
def notify_admins_new_signup_request(sender, instance, created, **kwargs):
    """Notify admins when a new admin signup request is submitted"""
    if created and instance.status == 'pending':
        try:
            admin_users = get_admin_users()
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='account_activity',
                    title='New Admin Signup Request',
                    message=f'{instance.fullNameEnglish} has requested admin access.',
                    data={
                        'signup_request_id': str(instance.id),
                        'user_name': instance.fullNameEnglish,
                        'email': instance.email,
                        'link': f'/signup-requests'
                    }
                )
        except Exception as e:
            print(f"Error creating signup request notification: {e}")


@receiver(post_save, sender=TeacherSignupRequest)
def notify_admins_new_teacher_signup_request(sender, instance, created, **kwargs):
    """Notify admins when a new teacher signup request is submitted"""
    if created and instance.status == 'pending':
        try:
            admin_users = get_admin_users()
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='account_activity',
                    title='New Teacher Signup Request',
                    message=f'{instance.fullNameEnglish} has requested to sign up as a teacher.',
                    data={
                        'teacher_signup_request_id': str(instance.id),
                        'user_name': instance.fullNameEnglish,
                        'email': instance.email,
                        'link': f'/signup-requests'
                    }
                )
        except Exception as e:
            print(f"Error creating teacher signup request notification: {e}")


@receiver(post_save, sender=Complaint)
def notify_admins_new_complaint(sender, instance, created, **kwargs):
    """Notify admins when a new complaint is submitted"""
    if created and instance.status == 'pending':
        try:
            admin_users = get_admin_users()
            complainant_name = instance.student.fullNameEnglish if instance.student else 'A user'
            
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='system_announcement',
                    title='New Complaint Submitted',
                    message=f'{complainant_name} has submitted a complaint: {instance.subject}',
                    data={
                        'complaint_id': str(instance.id),
                        'subject': instance.subject,
                        'category': instance.category,
                        'complainant_name': complainant_name,
                        'link': f'/complaints'
                    }
                )
        except Exception as e:
            print(f"Error creating complaint notification: {e}")
