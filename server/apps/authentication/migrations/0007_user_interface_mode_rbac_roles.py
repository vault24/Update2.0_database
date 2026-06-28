from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0006_alter_user_managers_alter_user_mobile_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='interface_mode',
            field=models.CharField(
                choices=[('simple', 'Simple Mode'), ('advanced', 'Advanced Mode')],
                default='simple',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('student', 'Student'),
                    ('captain', 'Captain'),
                    ('teacher', 'Teacher'),
                    ('registrar', 'Registrar'),
                    ('department_head', 'Department Head'),
                    ('institute_head', 'Institute Head'),
                ],
                default='student',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='signuprequest',
            name='requested_role',
            field=models.CharField(
                choices=[
                    ('registrar', 'Registrar'),
                    ('department_head', 'Department Head'),
                    ('institute_head', 'Institute Head'),
                ],
                max_length=20,
            ),
        ),
    ]
