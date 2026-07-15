"""
Tests for the alumni spreadsheet import (Excel / CSV / Google Sheets).

Covers the promises the feature makes to admins:
  * arbitrary column names resolve through the alias config,
  * a sheet holding only a subset of fields still imports,
  * unknown columns are ignored rather than fatal,
  * required fields are enforced per row,
  * columns belonging to the Student table are preserved alongside Alumni,
  * duplicates are skipped and every failure is reported row-wise,
  * the whole write is one transaction.
"""
import io

from django.test import TestCase
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from apps.departments.models import Department
from apps.students.models import Student
from apps.alumni.models import Alumni
from apps.alumni import import_service
from apps.alumni.import_config import (
    FIELD_SPECS,
    REQUIRED_KEYS,
    column_template,
    documentation,
    resolve_header,
)

User = get_user_model()


class ImportConfigTests(TestCase):
    def test_aliases_resolve_case_and_punctuation_insensitively(self):
        cases = {
            'Name': 'fullNameEnglish',
            'student name': 'fullNameEnglish',
            'FULL NAME': 'fullNameEnglish',
            "Father's Name": 'fatherName',
            'father name': 'fatherName',
            'F Name': 'fatherName',
            'Mobile Number': 'mobileStudent',
            'Phone': 'mobileStudent',
            'Dept': 'department',
            'Grad Year': 'graduationYear',
            'Designation': 'currentPosition.position',
            'Employer': 'currentPosition.company',
        }
        for header, expected in cases.items():
            spec = resolve_header(header)
            self.assertIsNotNone(spec, f'{header!r} should resolve')
            self.assertEqual(spec.key, expected, f'{header!r} -> {spec.key}')

    def test_unknown_header_resolves_to_none(self):
        self.assertIsNone(resolve_header('Favourite Colour'))
        self.assertIsNone(resolve_header(''))

    def test_only_name_and_department_are_required(self):
        self.assertEqual(set(REQUIRED_KEYS), {'fullNameEnglish', 'department'})

    def test_column_template_lists_required_first_and_covers_every_field(self):
        template = column_template()
        self.assertEqual(template[:2], ['Name', 'Department'])
        self.assertEqual(len(template), len(FIELD_SPECS))

    def test_documentation_exposes_every_field_for_the_ui(self):
        doc = documentation()
        self.assertEqual(len(doc['fields']), len(FIELD_SPECS))
        entry = next(f for f in doc['fields'] if f['key'] == 'fatherName')
        self.assertEqual(entry['target'], 'student')
        self.assertIn("Father's Name", entry['aliases'])
        self.assertFalse(entry['required'])

    def test_alias_table_has_no_ambiguity(self):
        # _build_lookup raises on a clash; importing the module proves it is clean.
        from apps.alumni import import_config
        self.assertGreater(len(import_config.HEADER_LOOKUP), len(FIELD_SPECS))


def _csv_bytes(rows):
    buffer = io.StringIO()
    for row in rows:
        buffer.write(','.join('' if c is None else str(c) for c in row) + '\n')
    return buffer.getvalue().encode('utf-8')


class ImportServiceTests(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Science & Technology', code='CST')
        Department.objects.create(name='Electrical Technology', code='ET')

    def test_imports_subset_of_columns_and_ignores_unknown_ones(self):
        headers = ['Student Name', 'Dept', 'Favourite Colour', 'Grad Year']
        rows = [
            ['Mahadi Hasan', 'CST', 'blue', '2023'],
            ['Zunaiyed Hafiz', 'Computer Science & Technology', 'red', '2022'],
        ]
        summary = import_service.import_alumni(headers, rows)

        self.assertEqual(summary['processed'], 2)
        self.assertEqual(summary['imported'], 2)
        self.assertEqual(summary['failed'], 0)
        self.assertIn('Favourite Colour', summary['analysis']['unknownColumns'])
        self.assertEqual(Alumni.objects.count(), 2)

        alumni = Alumni.objects.get(student__fullNameEnglish='Mahadi Hasan')
        self.assertEqual(alumni.graduationYear, 2023)
        self.assertEqual(alumni.student.department, self.dept)
        self.assertEqual(alumni.student.status, 'graduated')
        self.assertEqual(alumni.registrationSource, 'admin_manual')

    def test_student_table_columns_are_preserved_not_discarded(self):
        """The headline requirement: non-Alumni columns land on the Student row."""
        headers = [
            'Name', 'Department', "Father's Name", 'Mother Name', 'Mobile',
            'Email', 'District', 'Board Roll', 'Blood Group', 'Date of Birth',
            'Company', 'Position',
        ]
        rows = [[
            'Mahadi Hasan', 'CST', 'Abdul Karim', 'Fatema Begum', '01712345678',
            'mahadi@example.com', 'Sirajganj', '830577', 'B+', '1998-05-21',
            'Acme Ltd', 'Software Engineer',
        ]]
        summary = import_service.import_alumni(headers, rows)
        self.assertEqual(summary['imported'], 1)

        student = Student.objects.get(fullNameEnglish='Mahadi Hasan')
        self.assertEqual(student.fatherName, 'Abdul Karim')
        self.assertEqual(student.motherName, 'Fatema Begum')
        self.assertEqual(student.mobileStudent, '01712345678')
        self.assertEqual(student.email, 'mahadi@example.com')
        self.assertEqual(student.rollNumber, '830577')
        self.assertEqual(student.bloodGroup, 'B+')
        self.assertEqual(str(student.dateOfBirth), '1998-05-21')
        self.assertEqual(student.presentAddress.get('district'), 'Sirajganj')

        # …while the alumni-side columns land on the Alumni row.
        alumni = student.alumni
        self.assertEqual(alumni.currentPosition, {'company': 'Acme Ltd', 'position': 'Software Engineer'})

    def test_missing_required_column_blocks_the_whole_import(self):
        headers = ['Name', 'Mobile']  # no Department
        with self.assertRaises(import_service.ImportError_) as ctx:
            import_service.import_alumni(headers, [['Mahadi', '01712345678']])
        self.assertIn('Department', str(ctx.exception))
        self.assertEqual(Alumni.objects.count(), 0)

    def test_row_with_empty_required_value_fails_without_blocking_others(self):
        headers = ['Name', 'Department']
        rows = [
            ['Valid Person', 'CST'],
            ['', 'CST'],                 # missing name
            ['Bad Dept', 'NOPE'],        # unknown department
        ]
        summary = import_service.import_alumni(headers, rows)

        self.assertEqual(summary['processed'], 3)
        self.assertEqual(summary['imported'], 1)
        self.assertEqual(summary['failed'], 2)
        self.assertEqual(Alumni.objects.count(), 1)

        by_row = {e['rowNumber']: e['errors'] for e in summary['errors']}
        self.assertIn(3, by_row)  # header is row 1, so the blank name is row 3
        self.assertIn(4, by_row)
        self.assertTrue(any('does not match any department' in m for m in by_row[4]))

    def test_invalid_values_are_reported_per_row(self):
        headers = ['Name', 'Department', 'Grad Year', 'Email', 'Date of Birth']
        rows = [
            ['Good One', 'CST', '2023', 'good@example.com', '1998-05-21'],
            ['Bad Year', 'CST', 'not-a-year', 'nope', '31/31/9999'],
        ]
        summary = import_service.import_alumni(headers, rows)
        self.assertEqual(summary['imported'], 1)
        self.assertEqual(summary['failed'], 1)

        errors = summary['errors'][0]['errors']
        self.assertTrue(any('whole number' in e for e in errors))
        self.assertTrue(any('valid email' in e for e in errors))
        self.assertTrue(any('date' in e for e in errors))

    def test_duplicate_roll_is_skipped_not_failed(self):
        headers = ['Name', 'Department', 'Roll']
        import_service.import_alumni(headers, [['First', 'CST', 'CST-2019-001']])

        summary = import_service.import_alumni(headers, [
            ['Duplicate', 'CST', 'CST-2019-001'],   # already in the DB
            ['Fresh', 'CST', 'CST-2019-002'],
            ['In-file dup', 'CST', 'CST-2019-002'], # duplicate within this file
        ])
        self.assertEqual(summary['imported'], 1)
        self.assertEqual(summary['skipped'], 2)
        self.assertEqual(summary['failed'], 0)
        self.assertEqual(Student.objects.filter(currentRollNumber='CST-2019-001').count(), 1)

    def test_blank_roll_gets_unique_placeholder(self):
        headers = ['Name', 'Department']
        summary = import_service.import_alumni(headers, [['A', 'CST'], ['B', 'CST']])
        self.assertEqual(summary['imported'], 2)
        rolls = set(Student.objects.values_list('currentRollNumber', flat=True))
        self.assertEqual(len(rolls), 2)  # unique placeholders, no collision

    def test_choice_values_are_normalised(self):
        headers = ['Name', 'Department', 'Gender', 'Shift']
        summary = import_service.import_alumni(headers, [['A', 'CST', 'male', 'morning']])
        self.assertEqual(summary['imported'], 1)
        student = Student.objects.get(fullNameEnglish='A')
        self.assertEqual(student.gender, 'Male')
        self.assertEqual(student.shift, 'Morning')

    def test_dry_run_writes_nothing(self):
        headers = ['Name', 'Department']
        summary = import_service.import_alumni(headers, [['A', 'CST']], dry_run=True)
        self.assertEqual(summary['wouldImport'], 1)
        self.assertEqual(summary['imported'], 0)
        self.assertEqual(Alumni.objects.count(), 0)

    def test_preview_reports_mapping_without_writing(self):
        headers = ['Student Name', 'Dept', 'Mystery']
        preview = import_service.preview_import(headers, [['A', 'CST', 'x']])
        self.assertTrue(preview['canImport'])
        self.assertEqual(preview['totalRows'], 1)
        self.assertEqual(preview['validRows'], 1)
        self.assertEqual(preview['unknownColumns'], ['Mystery'])
        self.assertEqual({m['key'] for m in preview['mappedRequired']},
                         {'fullNameEnglish', 'department'})
        self.assertEqual(preview['missingRequired'], [])
        self.assertEqual(Alumni.objects.count(), 0)

    def test_preview_flags_missing_required_column(self):
        preview = import_service.preview_import(['Name'], [['A']])
        self.assertFalse(preview['canImport'])
        self.assertEqual([m['key'] for m in preview['missingRequired']], ['department'])

    def test_csv_source_is_parsed(self):
        data = _csv_bytes([
            ['Name', 'Dept', 'Grad Year'],
            ['CSV Person', 'CST', '2021'],
        ])
        upload = io.BytesIO(data)
        upload.name = 'alumni.csv'
        headers, rows = import_service.read_table(file=upload)
        self.assertEqual(headers, ['Name', 'Dept', 'Grad Year'])
        self.assertEqual(len(rows), 1)

        summary = import_service.import_alumni(headers, rows)
        self.assertEqual(summary['imported'], 1)

    def test_xlsx_source_is_parsed(self):
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(['Name', 'Department', 'Grad Year'])
        sheet.append(['Excel Person', 'CST', 2020])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        buffer.name = 'alumni.xlsx'

        headers, rows = import_service.read_table(file=buffer)
        self.assertEqual(headers, ['Name', 'Department', 'Grad Year'])
        summary = import_service.import_alumni(headers, rows)
        self.assertEqual(summary['imported'], 1)
        self.assertEqual(Alumni.objects.get(student__fullNameEnglish='Excel Person').graduationYear, 2020)

    def test_blank_trailing_rows_are_ignored(self):
        data = _csv_bytes([['Name', 'Dept'], ['A', 'CST'], ['', ''], ['', '']])
        upload = io.BytesIO(data)
        upload.name = 'a.csv'
        headers, rows = import_service.read_table(file=upload)
        self.assertEqual(len(rows), 1)


class GoogleSheetUrlTests(TestCase):
    def test_converts_share_link_to_csv_export(self):
        url = 'https://docs.google.com/spreadsheets/d/ABC123_xyz/edit#gid=456'
        self.assertEqual(
            import_service.google_sheet_csv_url(url),
            'https://docs.google.com/spreadsheets/d/ABC123_xyz/export?format=csv&gid=456',
        )

    def test_defaults_to_first_tab(self):
        url = 'https://docs.google.com/spreadsheets/d/ABC123/edit'
        self.assertTrue(import_service.google_sheet_csv_url(url).endswith('gid=0'))

    def test_rejects_non_google_hosts_ssrf_guard(self):
        for url in (
            'http://169.254.169.254/latest/meta-data/',
            'https://evil.example.com/spreadsheets/d/ABC/edit',
            'file:///etc/passwd',
        ):
            with self.assertRaises(import_service.ImportError_):
                import_service.google_sheet_csv_url(url)


class ImportAPITests(APITestCase):
    def setUp(self):
        self.dept = Department.objects.create(name='Computer Science & Technology', code='CST')
        self.admin = User.objects.create_user(
            username='reg@example.com', email='reg@example.com', password='pass12345',
            role='registrar', account_status='active',
        )
        self.student_user = User.objects.create_user(
            username='stu@example.com', email='stu@example.com', password='pass12345',
            role='student', account_status='active',
        )

    def _csv_upload(self, rows, name='alumni.csv'):
        upload = io.BytesIO(_csv_bytes(rows))
        upload.name = name
        return upload

    def test_schema_endpoint_returns_documentation(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/alumni/import-schema/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['fields']), len(FIELD_SPECS))
        self.assertEqual(response.data['columnTemplate'][:2], ['Name', 'Department'])

    def test_preview_endpoint(self):
        self.client.force_authenticate(self.admin)
        upload = self._csv_upload([['Name', 'Dept'], ['A', 'CST']])
        response = self.client.post('/api/alumni/import-preview/', {'file': upload}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['canImport'])
        self.assertEqual(response.data['totalRows'], 1)
        self.assertEqual(Alumni.objects.count(), 0)

    def test_import_endpoint_creates_records(self):
        self.client.force_authenticate(self.admin)
        upload = self._csv_upload([['Name', 'Dept', 'Mobile'], ['A', 'CST', '01712345678']])
        response = self.client.post('/api/alumni/import/', {'file': upload}, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['imported'], 1)
        self.assertEqual(Alumni.objects.count(), 1)

    def test_import_rejects_non_admin(self):
        self.client.force_authenticate(self.student_user)
        upload = self._csv_upload([['Name', 'Dept'], ['A', 'CST']])
        response = self.client.post('/api/alumni/import/', {'file': upload}, format='multipart')
        self.assertIn(response.status_code, (401, 403))
        self.assertEqual(Alumni.objects.count(), 0)

    def test_import_without_source_is_a_400(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/alumni/import/', {}, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)

    def test_missing_required_column_returns_400(self):
        self.client.force_authenticate(self.admin)
        upload = self._csv_upload([['Name'], ['A']])
        response = self.client.post('/api/alumni/import/', {'file': upload}, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Department', response.data['error'])
