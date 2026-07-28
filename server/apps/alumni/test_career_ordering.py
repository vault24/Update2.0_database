"""
Career Journey ordering: the most recently ADDED entry is always first.

Sorting purely by startDate put a new entry below older ones whenever it
started earlier (or on the same day), which is the opposite of what a student
expects immediately after adding it.
"""
from django.test import TestCase

from apps.alumni.models import Alumni
from apps.departments.models import Department
from apps.students.models import Student


class CareerOrderingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept = Department.objects.create(name='Computer', code='CST')

    def setUp(self):
        self.student = Student.objects.create(
            fullNameEnglish='Ordering Test', currentRollNumber='R-ORD',
            currentRegistrationNumber='REG-ORD', semester=6, shift='Morning',
            department=self.dept, status='active',
        )
        self.alumni = Alumni.objects.create(student=self.student)

    def _add(self, title, start):
        self.alumni.add_career_position({
            'positionType': 'job', 'positionTitle': title,
            'organizationName': f'{title} Co', 'startDate': start,
            'isCurrent': False, 'description': '', 'location': '',
        })

    def titles(self):
        self.alumni.refresh_from_db()
        return [c['positionTitle'] for c in self.alumni.careerHistory]

    def test_newest_added_entry_is_first(self):
        self._add('First', '2020-01-01')
        self._add('Second', '2021-01-01')
        self._add('Third', '2022-01-01')
        self.assertEqual(self.titles(), ['Third', 'Second', 'First'])

    def test_an_older_dated_entry_added_later_still_goes_on_top(self):
        """This is the case that used to sink to the bottom."""
        self._add('Recent Job', '2024-01-01')
        self._add('Old Internship', '2018-06-01')
        self.assertEqual(self.titles()[0], 'Old Internship')

    def test_entries_with_the_same_start_date_keep_newest_first(self):
        self._add('A', '2023-01-01')
        self._add('B', '2023-01-01')
        self.assertEqual(self.titles(), ['B', 'A'])

    def test_every_entry_gets_an_insertion_stamp(self):
        self._add('Stamped', '2023-01-01')
        self.alumni.refresh_from_db()
        self.assertTrue(self.alumni.careerHistory[0].get('addedAt'))

    def test_editing_an_entry_does_not_move_it(self):
        self._add('First', '2020-01-01')
        self._add('Second', '2021-01-01')
        target = [c for c in self.alumni.careerHistory if c['positionTitle'] == 'First'][0]

        self.alumni.update_career_position(target['id'], {
            'positionType': 'job', 'positionTitle': 'First (edited)',
            'organizationName': 'First Co', 'startDate': '2020-01-01',
            'isCurrent': False, 'description': 'updated', 'location': '',
        })
        # Still second — an edit must not jump the entry to the top.
        self.assertEqual(self.titles(), ['Second', 'First (edited)'])

    def test_legacy_entries_without_a_stamp_sort_below_new_ones(self):
        self.alumni.careerHistory = [
            {'id': 'legacy', 'positionTitle': 'Legacy', 'startDate': '2025-01-01'},
        ]
        self.alumni.save(update_fields=['careerHistory'])
        self._add('Brand New', '2010-01-01')
        self.assertEqual(self.titles(), ['Brand New', 'Legacy'])

    def test_deleting_leaves_the_rest_ordered(self):
        self._add('A', '2020-01-01')
        self._add('B', '2021-01-01')
        self._add('C', '2022-01-01')
        target = [c for c in self.alumni.careerHistory if c['positionTitle'] == 'B'][0]
        self.alumni.delete_career_position(target['id'])
        self.assertEqual(self.titles(), ['C', 'A'])
