# Generated migration for adding year and search_text fields

from django.db import migrations, models
from django.utils import timezone


def populate_year_field(apps, schema_editor):
    """Populate year field from uploadDate for existing documents"""
    Document = apps.get_model('documents', 'Document')
    for doc in Document.objects.all():
        doc.year = doc.uploadDate.year
        doc.save(update_fields=['year'])


def populate_search_text(apps, schema_editor):
    """Populate search_text field for existing documents"""
    Document = apps.get_model('documents', 'Document')
    for doc in Document.objects.all():
        search_parts = [doc.fileName]
        if doc.description:
            search_parts.append(doc.description)
        if doc.tags:
            search_parts.extend(doc.tags)
        doc.search_text = ' '.join(search_parts).lower()
        doc.save(update_fields=['search_text'])


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0005_add_structured_storage_fields'),
    ]

    operations = [
        # Add year field
        migrations.AddField(
            model_name='document',
            name='year',
            field=models.IntegerField(
                default=timezone.now().year,
                help_text='Year for partitioning (extracted from uploadDate)'
            ),
            preserve_default=False,
        ),
        # Add search_text field
        migrations.AddField(
            model_name='document',
            name='search_text',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Searchable text combining filename, description, and tags'
            ),
        ),
        # Populate year field
        migrations.RunPython(populate_year_field, migrations.RunPython.noop),
        # Populate search_text field
        migrations.RunPython(populate_search_text, migrations.RunPython.noop),
    ]
