"""
Add detailed attendance_type (present/absent/late/leave) and backfill from is_present.
"""
from django.db import migrations, models


def backfill_attendance_type(apps, schema_editor):
    AttendanceRecord = apps.get_model('attendance', 'AttendanceRecord')
    AttendanceRecord.objects.filter(attendance_type='', is_present=True).update(attendance_type='present')
    AttendanceRecord.objects.filter(attendance_type='', is_present=False).update(attendance_type='absent')


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0003_update_attendance_uniqueness'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='attendance_type',
            field=models.CharField(
                blank=True,
                choices=[('present', 'Present'), ('absent', 'Absent'), ('late', 'Late'), ('leave', 'Leave')],
                default='',
                max_length=10,
            ),
        ),
        migrations.RunPython(backfill_attendance_type, reverse_backfill),
    ]
