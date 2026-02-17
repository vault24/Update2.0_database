from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0002_alter_attendancerecord_options_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='attendancerecord',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='attendancerecord',
            constraint=models.UniqueConstraint(
                fields=('student', 'class_routine', 'date'),
                name='attendance_unique_student_routine_date',
            ),
        ),
        migrations.AddConstraint(
            model_name='attendancerecord',
            constraint=models.UniqueConstraint(
                condition=models.Q(class_routine__isnull=True),
                fields=('student', 'subject_code', 'date'),
                name='attendance_unique_student_subject_date_no_routine',
            ),
        ),
    ]

