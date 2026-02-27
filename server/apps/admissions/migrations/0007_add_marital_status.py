# Generated migration to add marital_status field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admissions', '0006_add_application_id_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='admission',
            name='marital_status',
            field=models.CharField(max_length=20, blank=True, help_text='Marital status of the applicant'),
        ),
    ]
