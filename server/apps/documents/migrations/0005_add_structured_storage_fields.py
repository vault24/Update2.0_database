"""
Add structured storage fields to Document model
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0004_documentaccesslog_document_access_permissions_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='document_type',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('student', 'Student Document'),
                    ('teacher', 'Teacher Document'),
                    ('alumni', 'Alumni Document'),
                    ('department', 'Department Document'),
                    ('system', 'System Document'),
                ],
                default='student',
                help_text='Type of document'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='department_code',
            field=models.CharField(
                max_length=50,
                blank=True,
                help_text='Department code for hierarchical storage'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='session',
            field=models.CharField(
                max_length=20,
                blank=True,
                help_text='Academic session (e.g., 2024-2025)'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='shift',
            field=models.CharField(
                max_length=50,
                blank=True,
                help_text='Shift (e.g., 1st-shift, 2nd-shift)'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='owner_name',
            field=models.CharField(
                max_length=255,
                blank=True,
                help_text='Name of document owner'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='owner_id',
            field=models.CharField(
                max_length=100,
                blank=True,
                help_text='ID of document owner (student ID, teacher ID, etc.)'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='document_category',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('photo', 'Photo'),
                    ('birth_certificate', 'Birth Certificate'),
                    ('nid', 'National ID'),
                    ('father_nid', 'Father NID'),
                    ('mother_nid', 'Mother NID'),
                    ('ssc_marksheet', 'SSC Marksheet'),
                    ('ssc_certificate', 'SSC Certificate'),
                    ('transcript', 'Transcript'),
                    ('medical_certificate', 'Medical Certificate'),
                    ('quota_document', 'Quota Document'),
                    ('other', 'Other'),
                ],
                default='other',
                help_text='Standardized document category'
            ),
        ),
        # Add indexes for better query performance
        migrations.AddIndex(
            model_name='document',
            index=models.Index(
                fields=['document_type', 'department_code', 'session'],
                name='doc_hierarchy_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='document',
            index=models.Index(
                fields=['owner_id', 'document_category'],
                name='doc_owner_cat_idx'
            ),
        ),
    ]
