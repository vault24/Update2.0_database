# Generated migration to initialize system settings

from django.db import migrations
import uuid


def create_default_settings(apps, schema_editor):
    """Create default system settings if none exist"""
    SystemSettings = apps.get_model('system_settings', 'SystemSettings')
    
    if not SystemSettings.objects.exists():
        SystemSettings.objects.create(
            id=uuid.uuid4(),
            current_academic_year='2024-2025',
            current_semester=1,
            enable_email_notifications=True,
            enable_sms_notifications=False,
            allow_student_registration=True,
            allow_teacher_registration=True,
            allow_admission_submission=True,
            institute_name='Sylhet Polytechnic Institute',
            institute_address='Sylhet, Bangladesh',
            institute_phone='',
            institute_email='',
            maintenance_mode=False,
            maintenance_message=''
        )


def reverse_settings(apps, schema_editor):
    """Remove default settings"""
    SystemSettings = apps.get_model('system_settings', 'SystemSettings')
    SystemSettings.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('system_settings', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_settings, reverse_settings),
    ]
