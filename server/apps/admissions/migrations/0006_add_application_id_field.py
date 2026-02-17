# Generated migration for adding application_id field to Admission model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admissions', '0005_add_nationality_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='admission',
            name='application_id',
            field=models.CharField(
                blank=True,
                help_text='Application ID same as Student ID (SIPI-{ssc_roll})',
                max_length=50,
                null=True,
                unique=True
            ),
        ),
    ]
