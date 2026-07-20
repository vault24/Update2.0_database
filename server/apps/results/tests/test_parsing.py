"""
Parser unit tests — every record family and every structural hazard the real
BTEB notices exhibit, on synthetic pages (no PDF/database needed).
"""
from decimal import Decimal

from django.test import SimpleTestCase

from apps.results.parsing import RecordFamily, SubjectRole, parse_result_pdf
from apps.results.parsing.grammar import parse_section
from apps.results.parsing.lines import LineKind, classify_line

from .fixtures import FakeExtractor, STANDARD_PAGES, parse_standard


class StandardDocumentTests(SimpleTestCase):
    """One parse of the synthetic 3-page notice, asserted from every angle."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.outcome = parse_standard()
        cls.records = {r.roll: r for r in cls.outcome.records}

    def test_exam_metadata(self):
        exam = self.outcome.exam
        self.assertEqual(exam.semester, 5)
        self.assertEqual(exam.regulation_year, 2022)
        self.assertEqual(exam.program, 'DIPLOMA IN ENGINEERING')
        self.assertEqual(exam.held_in, '2025 held in January-March, 2026')
        self.assertEqual(exam.memo_no, '57.17.0000.301.31.002.25.300')
        self.assertEqual(exam.publication_date, '28-04-2026')

    def test_institute_sections(self):
        self.assertEqual(
            [(i.code, i.name) for i in self.outcome.institutes],
            [
                ('99001', 'Testville Polytechnic Institute, Testville'),
                ('99002', 'Example Institute of Technology, Sadar'),
            ],
        )

    def test_all_records_found(self):
        self.assertEqual(len(self.records), 8)

    def test_no_errors_or_warnings(self):
        severities = {i.severity for i in self.outcome.issues}
        self.assertLessEqual(severities, {'info'}, self.outcome.issues)

    def test_passed_record(self):
        record = self.records['100001']
        self.assertIs(record.family, RecordFamily.PASSED)
        self.assertIsNone(record.cgpa)
        self.assertEqual(
            [(g.semester, g.gpa) for g in record.grades],
            [(5, Decimal('3.36')), (4, Decimal('3.27')), (3, Decimal('3.45')),
             (2, Decimal('3.12')), (1, Decimal('3.23'))],
        )

    def test_referred_record_with_wrapped_suffix(self):
        """28554's "(T,\\nP)" suffix is split across lines by the PDF."""
        record = self.records['100002']
        self.assertIs(record.family, RecordFamily.REFERRED)
        referred = {g.semester for g in record.grades if g.is_referred}
        self.assertEqual(referred, {5})
        subject = next(s for s in record.subjects if s.code == '28554')
        self.assertTrue(subject.theory)
        self.assertTrue(subject.practical)

    def test_expelled_with_body(self):
        record = self.records['100003']
        self.assertIs(record.family, RecordFamily.EXPELLED)
        self.assertEqual(record.expelled_rule, 'Combined Disciplinary Rule 1.3')
        roles = {(s.code, s.role) for s in record.subjects}
        self.assertIn(('26453', SubjectRole.EXPELLED), roles)
        self.assertIn(('25841', SubjectRole.REFERRED), roles)

    def test_bare_expelled_roll(self):
        """A roll with no body under an Expelled heading (glued numeral form)."""
        record = self.records['100004']
        self.assertIs(record.family, RecordFamily.EXPELLED)
        self.assertEqual(record.subjects, [])
        self.assertEqual(record.expelled_rule, 'Combined Disciplinary Rule 1.3')

    def test_record_split_across_page_boundary(self):
        """100005's subject list continues on page 2 after the full footer."""
        record = self.records['100005']
        self.assertIs(record.family, RecordFamily.FAILED)
        self.assertEqual(
            [s.code for s in record.subjects],
            ['25921', '27043', '27051', '27252'],
        )

    def test_continuous_fail_record(self):
        record = self.records['100006']
        self.assertIs(record.family, RecordFamily.CONTINUOUS_FAIL)
        own = [s for s in record.subjects if s.role is SubjectRole.CONTINUOUS_FAIL]
        self.assertEqual([s.code for s in own], ['26481'])
        referred = [s for s in record.subjects if s.role is SubjectRole.REFERRED]
        self.assertEqual([s.code for s in referred], ['26454', '26464'])

    def test_final_semester_cgpa_record(self):
        record = self.records['200001']
        self.assertIs(record.family, RecordFamily.PASSED)
        self.assertEqual(record.cgpa, Decimal('3.28'))
        self.assertEqual(len(record.grades), 8)

    def test_failed_record_suffix_variants(self):
        record = self.records['200002']
        by_code = {s.code: s for s in record.subjects}
        self.assertTrue(by_code['26447'].theory and by_code['26447'].practical)
        self.assertTrue(by_code['26475'].practical)
        self.assertFalse(by_code['26475'].theory)

    def test_records_attributed_to_correct_institute(self):
        by_institute = {
            inst.code: {r.roll for r in inst.records}
            for inst in self.outcome.institutes
        }
        self.assertEqual(
            by_institute['99001'],
            {'100001', '100002', '100003', '100004', '100005', '100006'},
        )
        self.assertEqual(by_institute['99002'], {'200001', '200002'})


class LineClassifierTests(SimpleTestCase):
    def test_boilerplate_lines(self):
        for line in (
            'Page 12 of 476',
            'Bangladesh Technical Education Board',
            'Memo No. 57.17.0000.301.31.002.25.300',
            'NOTICE',
            '2',
            'Copy of the published result is hereby sent for information',
            '( Mohammed Abul Shahin Kowser Sarker )',
        ):
            self.assertIs(classify_line(line, 1).kind, LineKind.BOILERPLATE, line)

    def test_institute_header(self):
        result = classify_line('50844 - International Modern Base (IMB) Non Govt. '
                               'Institute of Management Science and Technology, Dhaka', 1)
        self.assertIs(result.kind, LineKind.INSTITUTE_HEADER)
        self.assertEqual(result.match.group('code'), '50844')

    def test_expelled_heading_with_and_without_glued_numeral(self):
        for line in (
            'Expelled: (Combined Disciplinary Rule 1.2) -',
            '5 Expelled: (Combined Disciplinary Rule 1.3) -',
        ):
            result = classify_line(line, 1)
            self.assertIs(result.kind, LineKind.EXPELLED_HEADING, line)

    def test_record_lines_stay_content(self):
        for line in (
            '600740 { gpa5: ref, gpa4: ref, gpa3: ref, gpa2:',
            '701341 (gpa5: 3.36, gpa4: 3.27, gpa3: 3.45,',
            '612120 cgpa: 3.25 (gpa8: 3.75, gpa7: 3.11, gpa6:',
            '26442(T,P), 26443(T), 26451(T), 26456(T),',
        ):
            self.assertIs(classify_line(line, 1).kind, LineKind.CONTENT, line)


class GrammarEdgeCaseTests(SimpleTestCase):
    def test_subject_code_cannot_anchor_a_record(self):
        """"26441(T)" must never be read as roll 26441 + record body."""
        parsed = parse_section('600001 {  26441(T), 26442(T) }', [])
        self.assertEqual(len(parsed.records), 1)
        self.assertEqual(parsed.records[0].roll, '600001')

    def test_expelled_without_referred_part(self):
        parsed = parse_section('634299 ( Expelled_sub - 25851)', [])
        record = parsed.records[0]
        self.assertIs(record.family, RecordFamily.EXPELLED)
        self.assertEqual([s.code for s in record.subjects], ['25851'])

    def test_unknown_text_becomes_residual(self):
        parsed = parse_section('SOME BRAND NEW LAYOUT 600001 withheld', [])
        self.assertEqual(parsed.records, [])
        self.assertIn('600001', parsed.residual)

    def test_duplicate_roll_reported_by_validator(self):
        pages = STANDARD_PAGES + [STANDARD_PAGES[2]]  # institute B twice
        outcome = parse_result_pdf(b'', extractor=FakeExtractor(pages))
        codes = {i.code for i in outcome.issues}
        self.assertIn('duplicate-roll', codes)

    def test_gpa_out_of_range_reported(self):
        pages = ["""Page 1 of 1
99009 - Broken Institute, Nowhere
600100 (gpa5: 4.50, gpa4: 3.00, gpa3: 3.00,
gpa2: 3.00, gpa1: 3.00)
"""]
        outcome = parse_result_pdf(b'', extractor=FakeExtractor(pages))
        codes = {i.code for i in outcome.issues}
        self.assertIn('gpa-out-of-range', codes)
