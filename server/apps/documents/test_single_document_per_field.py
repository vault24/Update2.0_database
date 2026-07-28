"""
One document per document FIELD.

`fatherNIDFront`, `photo`, `sscMarksheet` ... are single slots: re-uploading
must REPLACE what is there, never add a second active record. The rule is
enforced by unique constraints on Document (so it holds even if a code path
forgets) and by supersede_field on every upload path.
"""
from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.departments.models import Department
from apps.documents.admission_documents import (
    ADMISSION_DOCUMENT_FIELDS, MULTI_VALUE_FIELDS, build_checklist,
    is_single_slot, supersede_field,
)
from apps.documents.models import Document
from apps.students.models import Student


def make_doc(student=None, field='fatherNIDFront', source_id=None, status='active'):
    return Document.objects.create(
        student=student,
        fileName=f'{field}.jpg', fileType='jpg', category='NID',
        filePath=f'x/{field}.jpg', fileSize=100,
        original_field_name=field, source_type='admission',
        source_id=source_id, status=status,
    )


class SingleDocumentPerFieldTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.student = Student.objects.create(
            fullNameEnglish='A B', currentRollNumber='R1',
            currentRegistrationNumber='REG1', semester=1, shift='Morning',
            department=cls.dept, status='active',
        )

    def test_second_active_document_for_the_same_field_is_rejected(self):
        make_doc(student=self.student)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                make_doc(student=self.student)

    def test_superseding_frees_the_slot(self):
        first = make_doc(student=self.student)
        superseded = supersede_field('fatherNIDFront', student_id=self.student.id)
        self.assertEqual(superseded, 1)
        first.refresh_from_db()
        self.assertEqual(first.status, 'archived')

        # The slot is now free, so the replacement saves cleanly.
        second = make_doc(student=self.student)
        active = Document.objects.filter(
            student=self.student, original_field_name='fatherNIDFront', status='active'
        )
        self.assertEqual(list(active), [second])

    def test_different_fields_do_not_collide(self):
        make_doc(student=self.student, field='fatherNIDFront')
        make_doc(student=self.student, field='fatherNIDBack')
        self.assertEqual(
            Document.objects.filter(student=self.student, status='active').count(), 2
        )

    def test_different_students_do_not_collide(self):
        other = Student.objects.create(
            fullNameEnglish='C D', currentRollNumber='R2',
            currentRegistrationNumber='REG2', semester=1, shift='Morning',
            department=self.dept, status='active',
        )
        make_doc(student=self.student)
        make_doc(student=other)
        self.assertEqual(Document.objects.filter(status='active').count(), 2)

    def test_extra_certificates_may_hold_several_files(self):
        """Supporting certificates are a bag, not a slot."""
        self.assertFalse(is_single_slot('extraCertificates'))
        make_doc(student=self.student, field='extraCertificates')
        make_doc(student=self.student, field='extraCertificates')
        self.assertEqual(
            Document.objects.filter(
                student=self.student, original_field_name='extraCertificates', status='active'
            ).count(),
            2,
        )

    def test_alumni_open_buckets_may_hold_several_files(self):
        for field in ('other', 'custom'):
            self.assertIn(field, MULTI_VALUE_FIELDS)
            make_doc(student=self.student, field=field)
            make_doc(student=self.student, field=field)

    def test_unlinked_admission_uploads_are_keyed_by_the_admission(self):
        """Admission uploads carry student=None until approval."""
        import uuid
        admission_id = uuid.uuid4()
        make_doc(student=None, source_id=admission_id)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                make_doc(student=None, source_id=admission_id)

    def test_superseding_an_unlinked_admission_upload(self):
        import uuid
        admission_id = uuid.uuid4()
        doc = make_doc(student=None, source_id=admission_id)
        self.assertEqual(supersede_field('fatherNIDFront', source_id=admission_id), 1)
        doc.refresh_from_db()
        self.assertEqual(doc.status, 'archived')

    def test_archived_documents_never_block_a_new_upload(self):
        make_doc(student=self.student, status='archived')
        make_doc(student=self.student, status='archived')
        make_doc(student=self.student)  # must not raise


class AdmissionChecklistTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')
        cls.student = Student.objects.create(
            fullNameEnglish='A B', currentRollNumber='R1',
            currentRegistrationNumber='REG1', semester=1, shift='Morning',
            department=cls.dept, status='active',
        )

    def test_checklist_lists_every_catalogue_field(self):
        checklist = build_checklist(student=self.student)
        self.assertEqual(len(checklist), len(ADMISSION_DOCUMENT_FIELDS))
        self.assertEqual(
            [c['field'] for c in checklist],
            [e['field'] for e in ADMISSION_DOCUMENT_FIELDS],
        )

    def test_nothing_uploaded_means_everything_is_missing(self):
        checklist = build_checklist(student=self.student)
        self.assertTrue(all(not c['submitted'] for c in checklist))

    def test_uploaded_documents_are_marked_submitted(self):
        make_doc(student=self.student, field='photo')
        by_field = {c['field']: c for c in build_checklist(student=self.student)}
        self.assertTrue(by_field['photo']['submitted'])
        self.assertEqual(len(by_field['photo']['documents']), 1)
        self.assertFalse(by_field['fatherNIDFront']['submitted'])

    def test_required_flags_come_from_admission_settings(self):
        checklist = build_checklist(
            student=self.student,
            requirements={'photo': True, 'testimonial': False},
        )
        by_field = {c['field']: c for c in checklist}
        self.assertTrue(by_field['photo']['required'])
        self.assertFalse(by_field['testimonial']['required'])
