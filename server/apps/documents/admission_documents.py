"""
Admission document catalogue + the single-document-per-field rule.

Every admission document is identified by its *field* (``photo``,
``fatherNIDFront``, ...), stored on ``Document.original_field_name``. A field
holds at most ONE active document: re-uploading supersedes the previous file
rather than piling up a second record. The rule is enforced here (so every
upload path goes through it) AND by unique constraints on the Document model.
"""
import logging

logger = logging.getLogger(__name__)


# Canonical catalogue: field -> label + the two category vocabularies the
# Document model stores. Order is the order shown to students.
ADMISSION_DOCUMENT_FIELDS = [
    {'field': 'photo', 'label': 'Passport-size Photo',
     'category': 'Photo', 'document_category': 'photo'},
    {'field': 'sscMarksheet', 'label': 'SSC Marksheet',
     'category': 'Marksheet', 'document_category': 'ssc_marksheet'},
    {'field': 'sscCertificate', 'label': 'SSC Certificate',
     'category': 'Certificate', 'document_category': 'ssc_certificate'},
    {'field': 'birthCertificateDoc', 'label': 'Birth Certificate',
     'category': 'Birth Certificate', 'document_category': 'birth_certificate'},
    {'field': 'studentNIDCopy', 'label': 'Student NID Copy',
     'category': 'NID', 'document_category': 'nid'},
    {'field': 'fatherNIDFront', 'label': "Father's NID (Front)",
     'category': 'NID', 'document_category': 'father_nid_front'},
    {'field': 'fatherNIDBack', 'label': "Father's NID (Back)",
     'category': 'NID', 'document_category': 'father_nid_back'},
    {'field': 'motherNIDFront', 'label': "Mother's NID (Front)",
     'category': 'NID', 'document_category': 'mother_nid_front'},
    {'field': 'motherNIDBack', 'label': "Mother's NID (Back)",
     'category': 'NID', 'document_category': 'mother_nid_back'},
    {'field': 'testimonial', 'label': 'Testimonial',
     'category': 'Testimonial', 'document_category': 'transcript'},
    {'field': 'medicalCertificate', 'label': 'Medical Certificate',
     'category': 'Medical Certificate', 'document_category': 'medical_certificate'},
    {'field': 'quotaDocument', 'label': 'Quota Document',
     'category': 'Quota Document', 'document_category': 'quota_document'},
    {'field': 'extraCertificates', 'label': 'Extra Certificates',
     'category': 'Certificate', 'document_category': 'other'},
]

FIELD_MAP = {entry['field']: entry for entry in ADMISSION_DOCUMENT_FIELDS}

# Reverse lookup used by upload paths that only know the structured-storage
# category (admin uploads). 'other' has no single slot, so it maps to ''.
DOCUMENT_CATEGORY_TO_FIELD = {
    entry['document_category']: entry['field']
    for entry in ADMISSION_DOCUMENT_FIELDS
    if entry['document_category'] != 'other'
}
# The structured upload API also accepts these coarser NID categories.
DOCUMENT_CATEGORY_TO_FIELD.setdefault('father_nid', 'fatherNIDFront')
DOCUMENT_CATEGORY_TO_FIELD.setdefault('mother_nid', 'motherNIDFront')

# Fields that are deliberately a BAG of files rather than a single slot:
# supporting certificates on the admission form, and the alumni module's
# open-ended "other"/"custom" buckets. Everything else is one-file-per-field.
# Keep in sync with the unique constraints on Document.
MULTI_VALUE_FIELDS = {'extraCertificates', 'other', 'custom'}
MULTI_VALUE_FIELD_LIST = sorted(MULTI_VALUE_FIELDS)


def is_single_slot(field_name):
    """Whether `field_name` may hold only one active document."""
    return bool(field_name) and field_name not in MULTI_VALUE_FIELDS


def category_for(field_name):
    entry = FIELD_MAP.get(field_name)
    return entry['category'] if entry else 'Other'


def document_category_for(field_name):
    entry = FIELD_MAP.get(field_name)
    return entry['document_category'] if entry else 'other'


def label_for(field_name):
    entry = FIELD_MAP.get(field_name)
    return entry['label'] if entry else (field_name or 'Document')


def existing_documents_for_field(field_name, *, student_id=None, source_id=None):
    """
    Active documents already occupying `field_name` for this owner.

    Admission uploads carry student_id=None until the admission is approved, so
    the owner is matched by student when known and by the source admission id
    otherwise — the same pair the unique constraints key on.
    """
    from django.db.models import Q
    from .models import Document

    if not field_name:
        return Document.objects.none()
    if not student_id and not source_id:
        return Document.objects.none()

    owner = Q(pk__in=[])
    if student_id:
        owner |= Q(student_id=student_id)
    if source_id:
        owner |= Q(source_id=source_id, source_type='admission')

    return Document.objects.filter(owner).filter(
        original_field_name=field_name, status='active'
    )


def supersede_field(field_name, *, student_id=None, source_id=None, keep_id=None,
                    delete_files=True):
    """
    Archive every active document currently occupying `field_name`, so a newly
    uploaded file becomes the single active document for that field.

    Records are archived (``status='archived'``), never hard-deleted, keeping
    the audit trail; the physical file is removed unless ``delete_files=False``.
    Returns the number of superseded records.
    """
    if not is_single_slot(field_name):
        return 0

    stale = existing_documents_for_field(
        field_name, student_id=student_id, source_id=source_id
    )
    if keep_id:
        stale = stale.exclude(pk=keep_id)

    superseded = 0
    for doc in list(stale):
        doc.status = 'archived'
        doc.save(update_fields=['status', 'lastModified'])
        superseded += 1
        if delete_files and doc.filePath:
            try:
                from utils.structured_file_storage import structured_storage
                structured_storage.delete_file(doc.filePath)
            except Exception as exc:  # storage problems must not block the upload
                logger.warning('Could not remove superseded file %s: %s', doc.filePath, exc)
    return superseded


def build_checklist(*, student=None, admission=None, requirements=None):
    """
    The admission-document checklist for one applicant/student:
    every catalogue field with whether it is required and what has been
    submitted. Drives the student "missing documents" UI.
    """
    from .models import Document

    if requirements is None:
        try:
            from apps.admissions.models import AdmissionSettings
            requirements = AdmissionSettings.get_settings().merged_document_requirements()
        except Exception:
            requirements = {}

    from django.db.models import Q
    owner = Q(pk__in=[])
    if student is not None:
        owner |= Q(student_id=student.id)
    if admission is not None:
        owner |= Q(source_id=admission.id, source_type='admission')

    docs = Document.objects.filter(owner).filter(status='active').order_by('-uploadDate')

    by_field = {}
    for doc in docs:
        by_field.setdefault(doc.original_field_name, []).append(doc)

    checklist = []
    for entry in ADMISSION_DOCUMENT_FIELDS:
        field = entry['field']
        found = by_field.get(field, [])
        checklist.append({
            'field': field,
            'label': entry['label'],
            'category': entry['category'],
            'required': bool(requirements.get(field, False)),
            'multiple': field in MULTI_VALUE_FIELDS,
            'submitted': bool(found),
            'documents': [
                {
                    'id': str(d.id),
                    'fileName': d.fileName,
                    'fileType': d.fileType,
                    'fileSize': d.fileSize,
                    'file_url': d.file_url,
                    'uploadDate': d.uploadDate.isoformat() if d.uploadDate else None,
                }
                for d in found
            ],
        })
    return checklist
