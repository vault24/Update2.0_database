# Generated migration for adding student_id field to User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_passwordresetattempt_otptoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='student_id',
            field=models.CharField(
                blank=True,
                help_text='Student ID in format SIPI-{ssc_roll}',
                max_length=50,
                null=True,
                unique=True
            ),
        ),
    ]
