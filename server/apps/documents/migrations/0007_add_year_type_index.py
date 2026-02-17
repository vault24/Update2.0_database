# Add index for year and document_type

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0006_add_year_and_search_fields'),
    ]

    operations = [
        # Add index for year field
        migrations.AddIndex(
            model_name='document',
            index=models.Index(fields=['year'], name='doc_year_idx'),
        ),
        # Add index for year + document_type
        migrations.AddIndex(
            model_name='document',
            index=models.Index(fields=['year', 'document_type'], name='doc_year_type_idx'),
        ),
    ]
