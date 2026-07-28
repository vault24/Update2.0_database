"""
Enforce one active document per document field at the database level.

Existing data may already contain duplicates (the rule was only ever a
frontend convention), so the newest active document per owner+field is kept
and older ones are archived before the constraints are added.
"""
from django.db import migrations, models


# Fields that legitimately hold many files (admission "extra certificates" and
# the alumni open-ended buckets). Mirrors documents.models.
MULTI_VALUE_FIELDS = ['custom', 'extraCertificates', 'other']


def archive_duplicate_documents(apps, schema_editor):
    Document = apps.get_model('documents', 'Document')

    seen = set()
    to_archive = []
    qs = (
        Document.objects
        .filter(status='active')
        .exclude(original_field_name='')
        .exclude(original_field_name__in=MULTI_VALUE_FIELDS)
        .order_by('-uploadDate', '-id')
        .only('id', 'student_id', 'source_id', 'original_field_name')
    )
    for doc in qs.iterator():
        # Same ownership key the unique constraints use.
        owner = doc.student_id if doc.student_id else ('src', doc.source_id)
        if owner == ('src', None):
            continue  # no owner to key on — constraint does not apply
        key = (owner, doc.original_field_name)
        if key in seen:
            to_archive.append(doc.id)
        else:
            seen.add(key)

    for i in range(0, len(to_archive), 500):
        Document.objects.filter(id__in=to_archive[i:i + 500]).update(status='archived')


def noop(apps, schema_editor):
    """Archived duplicates are intentionally left archived on reverse."""


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0009_documenttemplate'),
    ]

    operations = [
        migrations.RunPython(archive_duplicate_documents, noop),
        migrations.AddConstraint(
            model_name='document',
            constraint=models.UniqueConstraint(
                condition=(
                    models.Q(status='active')
                    & models.Q(student__isnull=False)
                    & ~models.Q(original_field_name='')
                    & ~models.Q(original_field_name__in=MULTI_VALUE_FIELDS)
                ),
                fields=('student', 'original_field_name'),
                name='uniq_active_document_per_student_field',
            ),
        ),
        migrations.AddConstraint(
            model_name='document',
            constraint=models.UniqueConstraint(
                condition=(
                    models.Q(status='active')
                    & models.Q(student__isnull=True)
                    & models.Q(source_id__isnull=False)
                    & ~models.Q(original_field_name='')
                    & ~models.Q(original_field_name__in=MULTI_VALUE_FIELDS)
                ),
                fields=('source_id', 'original_field_name'),
                name='uniq_active_document_per_source_field',
            ),
        ),
    ]
