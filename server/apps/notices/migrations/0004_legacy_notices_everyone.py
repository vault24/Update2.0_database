"""Mark pre-targeting notices as audience='everyone'.

Before audience targeting existed, every portal user (students, captains,
teachers and alumni accounts) could see every published notice. New notices
default to 'students_teachers', but flipping existing rows to 'everyone'
preserves exactly what each user could already see.
"""
from django.db import migrations


def legacy_notices_to_everyone(apps, schema_editor):
    Notice = apps.get_model('notices', 'Notice')
    Notice.objects.all().update(audience='everyone')


def revert(apps, schema_editor):
    Notice = apps.get_model('notices', 'Notice')
    Notice.objects.all().update(audience='students_teachers')


class Migration(migrations.Migration):

    dependencies = [
        ('notices', '0003_notice_audience_notice_recipient_count_and_more'),
    ]

    operations = [
        migrations.RunPython(legacy_notices_to_everyone, revert),
    ]
