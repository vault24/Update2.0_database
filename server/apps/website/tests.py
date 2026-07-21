"""Tests for the public website API.

Focus: the two properties that matter most for a public, anonymous surface —
(1) endpoints are reachable WITHOUT authentication (they opt out of the
project's deny-by-default), and (2) they never leak private fields.
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.departments.models import Department
from apps.teachers.models import Teacher
from apps.notices.models import Notice
from apps.authentication.models import User
from apps.website.models import Event, HeroSlide, SiteSetting


class PublicAccessTests(TestCase):
    """Every website endpoint must answer 200 to an anonymous client."""

    def setUp(self):
        self.client = APIClient()
        SiteSetting.get_solo()
        HeroSlide.objects.create(headline_en="Welcome", image="website/hero/x.jpg")
        Event.objects.create(title_en="Fest", slug="fest", start_at=timezone.now())

    def test_endpoints_allow_anonymous(self):
        for url in [
            "/api/website/settings/", "/api/website/hero/", "/api/website/events/",
            "/api/website/news/", "/api/website/analytics/", "/api/website/departments/",
            "/api/website/teachers/", "/api/website/notices/", "/api/website/achievements/",
            "/api/website/gallery/", "/api/website/downloads/", "/api/website/faq/",
            "/api/website/search/?q=fest",
        ]:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200, f"{url} returned {resp.status_code}")


class TeacherPrivacyTests(TestCase):
    """The public faculty directory must not expose private contact fields."""

    def setUp(self):
        self.client = APIClient()
        dept = Department.objects.create(name="Computer", code="CT")
        Teacher.objects.create(
            fullNameBangla="নাম", fullNameEnglish="Jane Doe", designation="Instructor",
            department=dept, email="jane@example.com", mobileNumber="01700000000",
            officeLocation="Room 1", joiningDate="2020-01-01",
        )

    def test_no_mobile_number_leak(self):
        body = self.client.get("/api/website/teachers/").content.decode()
        self.assertNotIn("mobileNumber", body)
        self.assertNotIn("01700000000", body)

    def test_retired_teachers_hidden(self):
        Teacher.objects.create(
            fullNameEnglish="Retired Person", designation="Ex", email="r@example.com",
            mobileNumber="01711111111", officeLocation="-", joiningDate="2000-01-01",
            employmentStatus="retired",
        )
        body = self.client.get("/api/website/teachers/").content.decode()
        self.assertNotIn("Retired Person", body)


class NoticeVisibilityTests(TestCase):
    """Only published notices are exposed."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="notice_admin", email="a@b.com", password="x", role="institute_head")
        Notice.objects.create(title="Public one", content="c", created_by=self.user, is_published=True)
        Notice.objects.create(title="Hidden draft", content="c", created_by=self.user, is_published=False)

    def test_only_published_notices(self):
        body = self.client.get("/api/website/notices/").content.decode()
        self.assertIn("Public one", body)
        self.assertNotIn("Hidden draft", body)


class AnalyticsAggregateTests(TestCase):
    """Analytics must be aggregate-only (counts), never per-student rows."""

    def test_shape_is_aggregate(self):
        client = APIClient()
        data = client.get("/api/website/analytics/").json()
        self.assertIn("students", data)
        self.assertIn("total", data["students"])
        self.assertIsInstance(data["students"]["total"], int)
        self.assertIn("departments", data)
