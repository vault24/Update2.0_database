"""
Regression tests for the rendered (downloaded / printed) document.

Covers three defects the rendered output used to have:
  * the student ID card lost its photo and QR code (the tokens were never
    filled, so they were blanked out);
  * the ID-card template shipped its own green "Print ID Card" button, which
    ended up inside the exported file;
  * documents reflowed and got clipped on mobile because the page is a fixed
    physical size but the viewport was `width=device-width`.
"""
from django.test import TestCase

from apps.applications.models import Application
from apps.applications.views import (
    _document_design_width,
    _harden_document_html,
    _qr_code_img,
    _render_document_html,
    _student_photo_data_uri,
)
from apps.departments.models import Department
from apps.documents.models import DocumentTemplate
from apps.students.models import Student


# A 1x1 transparent PNG — enough to stand in for a profile photo.
ONE_PIXEL_PNG_B64 = (
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA'
    '60e6kgAAAABJRU5ErkJggg=='
)

ID_CARD_HTML = """<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ID</title>
<style>.id-card { width: 53.98mm; height: 85.60mm; }</style>
</head><body>
<div class="controls no-print">
  <button class="btn" onclick="window.print()">Print ID Card</button>
</div>
<img class="photo" src="{{photo}}" alt="">
<div>{{name}}</div>
<div>{{bloodGroup}}</div>
<div>{{phoneNumber}}</div>
<div class="qr">{{QR_CODE}}</div>
<div>{{EMERGENCY_CONTACT}}</div>
</body></html>"""


class DocumentRenderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CS')
        cls.student = Student.objects.create(
            fullNameEnglish='Rima Akter', currentRollNumber='123456',
            currentRegistrationNumber='REG-123456', semester=3, shift='Morning',
            department=cls.dept, status='active',
            bloodGroup='B+', mobileStudent='01700000000',
            guardianMobile='01800000000',
            # A 1x1 PNG inlined directly — exercises the data: passthrough.
            profilePhoto='data:image/png;base64,' + ONE_PIXEL_PNG_B64,
        )
        cls.template = DocumentTemplate.objects.create(
            name='ID Card', slug='test-id-card', category='idCard',
            html_content=ID_CARD_HTML,
        )
        cls.application = Application.objects.create(
            fullNameBangla='রিমা', fullNameEnglish='Rima Akter',
            fatherName='Father', motherName='Mother',
            department='Computer', session='2023-2024', shift='Morning',
            rollNumber='123456', registrationNumber='REG-123456',
            applicationType='ID Card', subject='ID Card', message='need one',
            status='approved', student=cls.student, template=cls.template,
        )

    # ---- Task 6: photo + QR must survive to the downloaded file -------------
    def test_photo_is_inlined_on_the_card(self):
        html = _render_document_html(self.application, None)
        self.assertIn('src="data:image/png;base64,', html)
        self.assertNotIn('{{photo}}', html)

    def test_qr_code_is_rendered_as_an_inline_image(self):
        html = _render_document_html(self.application, None)
        self.assertIn('alt="Profile QR code"', html)
        self.assertNotIn('{{QR_CODE}}', html)

    def test_qr_encodes_the_public_profile_url(self):
        img = _qr_code_img('https://spisg.gov.bd/student/123456')
        self.assertTrue(img.startswith('<img src="data:image/png;base64,'))

    def test_qr_is_blank_when_there_is_nothing_to_encode(self):
        self.assertEqual(_qr_code_img(''), '')

    def test_card_detail_fields_are_filled(self):
        html = _render_document_html(self.application, None)
        self.assertIn('B+', html)
        self.assertIn('01700000000', html)
        # Emergency contact falls back to the guardian's number.
        self.assertIn('01800000000', html)

    def test_missing_photo_leaves_the_slot_empty_not_broken(self):
        self.student.profilePhoto = ''
        self.student.save(update_fields=['profilePhoto'])
        self.application.refresh_from_db()
        html = _render_document_html(self.application, None)
        self.assertNotIn('{{photo}}', html)
        self.assertEqual(_student_photo_data_uri(self.student), '')

    # ---- Task 7: no in-document print control ------------------------------
    def test_print_button_never_reaches_the_output(self):
        html = _render_document_html(self.application, None)
        self.assertNotIn('window.print()', html)
        self.assertNotIn('Print ID Card', html)

    # ---- Task 9: identical layout on every device --------------------------
    def test_viewport_is_pinned_to_the_document_width(self):
        html = _render_document_html(self.application, None)
        self.assertIn('content="width=204"', html)
        self.assertNotIn('width=device-width', html)

    def test_viewport_has_no_initial_scale(self):
        """`initial-scale=1` would open the document zoomed right in on a
        phone — the browser must be left to scale it to fit."""
        html = _render_document_html(self.application, None)
        self.assertNotIn('initial-scale', html)

    def test_fixed_layout_css_is_injected(self):
        html = _render_document_html(self.application, None)
        self.assertIn('id="fixed-document-layout"', html)
        self.assertIn('text-size-adjust: 100%', html)
        self.assertIn('min-width: 204px', html)

    def test_design_width_matches_the_page_size(self):
        self.assertEqual(_document_design_width('.page { width: 210mm; }'), 794)
        self.assertEqual(_document_design_width('.page { width: 297mm; }'), 1123)
        self.assertEqual(_document_design_width('.id-card { width: 53.98mm; }'), 204)
        # Unknown page size falls back to A4 portrait rather than breaking.
        self.assertEqual(_document_design_width('<p>no page size</p>'), 794)

    def test_hardening_is_idempotent(self):
        once = _harden_document_html(ID_CARD_HTML)
        twice = _harden_document_html(once)
        self.assertEqual(twice.count('id="fixed-document-layout"'), 2)
        self.assertNotIn('window.print()', twice)
        self.assertEqual(twice.count('name="viewport"'), 1)
