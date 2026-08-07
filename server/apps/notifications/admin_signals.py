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
                    message=f'{complainant_name} has submitted a complaint: {instance.title}',
                    data={
                        'complaint_id': str(instance.id),
                        'title': instance.title,
                        'category': instance.category.label if instance.category else '',
                        'complainant_name': complainant_name,
                        'link': f'/complaints'
                    }
                )
        except Exception as e:
            print(f"Error creating complaint notification: {e}")


# ── Acknowledgement email to the student who submitted any report ─────────────

@receiver(post_save, sender=Complaint)
def send_complaint_acknowledgement_to_student(sender, instance, created, **kwargs):
    """
    Send a bilingual (Bengali + English) acknowledgement / feedback receipt
    email to the student immediately after they submit any complaint/report.
    Fires only on creation so the student receives exactly one email per report.
    """
    if not created:
        return

    try:
        # Resolve the student's email address.
        # Anonymous reports still get an email if reporter_email was provided.
        if instance.is_anonymous:
            recipient_email = instance.reporter_email or None
            recipient_name = 'Student'
        elif instance.student:
            recipient_email = instance.student.email or None
            recipient_name = instance.student.fullNameEnglish or 'Student'
        else:
            recipient_email = instance.reporter_email or None
            recipient_name = instance.reporter_name or 'Student'

        if not recipient_email:
            return  # No email address available — nothing to send

        category_label = instance.category.label if instance.category else 'General'
        subcategory_label = instance.subcategory.name if instance.subcategory else '—'
        reference = instance.reference_number or str(instance.id)
        submitted_at = instance.created_at.strftime('%d %b %Y, %I:%M %p') if instance.created_at else '—'

        from apps.notifications.email_service import send_branded_email

        send_branded_email(
            subject=f'আপনার রিপোর্টটি পেয়েছি — {reference} | Report Received',
            to=recipient_email,
            heading='আপনার রিপোর্টটি আমরা পেয়েছি ✓',
            greeting=f'প্রিয় {recipient_name},',
            intro=(
                'আপনার রিপোর্টটি সফলভাবে জমা হয়েছে। '
                'আমরা আপনার রিপোর্টটি অত্যন্ত গুরুত্বের সাথে বিবেচনা করব এবং '
                'যত দ্রুত সম্ভব সমাধান করার চেষ্টা করব।<br><br>'
                '<em>Your report has been successfully received. '
                'We take every report seriously and will work to resolve it as quickly as possible.</em>'
            ),
            accent_label=category_label,
            accent_color='#2563eb',
            accent_soft='#eff6ff',
            details=[
                {'label': 'রেফারেন্স নম্বর / Reference No.', 'value': reference},
                {'label': 'শিরোনাম / Title',                  'value': instance.title},
                {'label': 'বিভাগ / Category',                 'value': category_label},
                {'label': 'সমস্যার ধরন / Issue Type',         'value': subcategory_label},
                {'label': 'অগ্রাধিকার / Priority',            'value': instance.priority.capitalize()},
                {'label': 'জমার সময় / Submitted At',          'value': submitted_at},
                {'label': 'বর্তমান অবস্থা / Status',          'value': 'Pending Review'},
            ],
            sections=[
                {
                    'title': '📋 পরবর্তী পদক্ষেপ / What Happens Next',
                    'lines': [
                        'আপনার রিপোর্টটি আমাদের দল পর্যালোচনা করবে এবং দ্রুততার সাথে ব্যবস্থা নেওয়া হবে।',
                        'রিপোর্টটি সমাধান হয়ে গেলে আপনাকে এই ইমেইলেই জানানো হবে।',
                        '<em>Our team will review your report and take appropriate action promptly. '
                        'You will be notified at this email address once the issue is resolved.</em>',
                    ],
                },
                {
                    'title': '⚠️ গুরুত্বপূর্ণ সতর্কতা / Important Warning',
                    'lines': [
                        '<strong>দয়া করে নিচের বিষয়গুলো মনে রাখবেন:</strong>',
                    ],
                    'bullets': [
                        'মিথ্যা, বানোয়াট বা অপ্রাসঙ্গিক রিপোর্ট জমা দেওয়া থেকে বিরত থাকুন।'
                        ' / <em>Please avoid submitting false, fabricated, or irrelevant reports.</em>',

                        'স্প্যাম বা একই বিষয়ে একাধিকবার রিপোর্ট করবেন না।'
                        ' / <em>Do not spam or submit duplicate reports for the same issue.</em>',

                        'অন্য কাউকে হয়রানি বা ক্ষতি করার উদ্দেশ্যে রিপোর্ট ব্যবহার করবেন না।'
                        ' / <em>Do not use the report system to harass or harm others.</em>',

                        'আপনার সমস্ত তথ্য — নাম, রেজিস্ট্রেশন নম্বর, বিভাগ — আমাদের ডেটাবেজে '
                        'সংরক্ষিত এবং আমাদের দলের কাছে সম্পূর্ণ দৃশ্যমান।'
                        ' / <em>All your information — name, registration number, department — '
                        'is stored in our database and fully visible to our team.</em>',

                        'যেকোনো অপব্যবহারের ক্ষেত্রে শাস্তিমূলক ব্যবস্থা নেওয়া হতে পারে।'
                        ' / <em>Misuse of this system may result in disciplinary action.</em>',
                    ],
                },
            ],
            closing=(
                'আপনার সহযোগিতার জন্য ধন্যবাদ। আমরা একটি ভালো ও কার্যকর প্ল্যাটফর্ম তৈরিতে '
                'আপনার মতামতকে অত্যন্ত গুরুত্ব দিই।<br><br>'
                '<em>Thank you for your cooperation. Your feedback helps us build a better platform for everyone.</em>'
            ),
            footer_note=(
                'এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে। সরাসরি উত্তর দেবেন না। '
                '/ This is an automated email. Please do not reply directly.'
            ),
            category='notification',
            async_send=True,
        )
    except Exception as exc:
        print(f"Error sending complaint acknowledgement email: {exc}")


# ── Developer email alert for website / portal reports ───────────────────────

DEVELOPER_EMAIL = 'vault7950@gmail.com'

# Fixed UUID for the "Website" core category (defined in ComplaintCategory model)
import uuid as _uuid
_WEBSITE_CATEGORY_UUID = _uuid.UUID('22222222-2222-2222-2222-222222222222')


@receiver(post_save, sender=Complaint)
def notify_developer_website_report(sender, instance, created, **kwargs):
    """
    Send a detailed email to the developer (vault7950@gmail.com) whenever a
    student submits a report in the 'Website / Portal' category.
    Fires only on creation so the developer is not spammed on every save.
    """
    if not created:
        return

    try:
        # Check whether this complaint belongs to the website category
        if not instance.category_id:
            return
        if instance.category_id != _WEBSITE_CATEGORY_UUID:
            return

        # Gather reporter info
        if instance.is_anonymous:
            reporter_name = 'Anonymous'
            reporter_email = '—'
            reporter_id = '—'
            department_name = '—'
        elif instance.student:
            reporter_name = instance.student.fullNameEnglish or 'Unknown Student'
            reporter_email = instance.student.email or '—'
            # Use currentRegistrationNumber as the human-readable student ID
            reporter_id = getattr(instance.student, 'currentRegistrationNumber', None) or str(instance.student.id)
            dept = getattr(instance.student, 'department', None)
            department_name = dept.name if dept else '—'
        else:
            reporter_name = instance.reporter_name or 'Unknown'
            reporter_email = instance.reporter_email or '—'
            reporter_id = '—'
            department_name = '—'

        subcategory_label = instance.subcategory.name if instance.subcategory else '—'
        reference = instance.reference_number or str(instance.id)
        submitted_at = instance.created_at.strftime('%d %b %Y, %I:%M %p UTC') if instance.created_at else '—'

        from apps.notifications.email_service import send_branded_email

        send_branded_email(
            subject=f'[Website Report] {instance.title} — {reference}',
            to=DEVELOPER_EMAIL,
            heading='New Website / Portal Report Received',
            greeting=f'Hi Developer,',
            intro=(
                'A student has submitted a new report in the '
                '<strong>Website / Portal</strong> category on the student portal. '
                'The full details are below.'
            ),
            accent_label='Website Report',
            accent_color='#7c3aed',
            accent_soft='#f5f3ff',
            details=[
                {'label': 'Reference No.',   'value': reference},
                {'label': 'Title',           'value': instance.title},
                {'label': 'Issue Type',      'value': subcategory_label},
                {'label': 'Priority',        'value': instance.priority.capitalize()},
                {'label': 'Reporter',        'value': reporter_name},
                {'label': 'Reporter Email',  'value': reporter_email},
                {'label': 'Student ID',      'value': reporter_id},
                {'label': 'Department',      'value': department_name},
                {'label': 'Submitted At',    'value': submitted_at},
            ],
            body_lines=[
                '<strong>Description:</strong>',
                instance.description or '(No description provided)',
            ],
            closing='Please review this report in the admin panel and take appropriate action.',
            footer_note='This is an automated alert from the Student Portal complaint system.',
            category='security',   # bypass email opt-out — always deliver
            async_send=True,
        )
    except Exception as exc:
        print(f"Error sending developer website-report email: {exc}")
