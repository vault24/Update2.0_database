# Generated migration to add nationality field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admissions', '0004_admission_document_processing_errors_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='admission',
            name='nationality',
            field=models.CharField(max_length=100, default='Bangladeshi', blank=True),
        ),
    ]
