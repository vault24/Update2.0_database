"""
Tests for System Settings app
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User
from .models import SystemSettings


class SystemSettingsModelTest(TestCase):
    def test_get_settings_singleton(self):
        settings1 = SystemSettings.get_settings()
        settings2 = SystemSettings.get_settings()
        self.assertEqual(settings1.id, settings2.id)
    
    def test_default_values(self):
        settings = SystemSettings.get_settings()
        self.assertEqual(settings.current_academic_year, '2024-2025')
        self.assertEqual(settings.current_semester, 1)
        self.assertTrue(settings.enable_email_notifications)


class SystemSettingsViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_settings(self):
        url = reverse('system-settings')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current_academic_year', response.data)
    
    def test_update_settings(self):
        url = reverse('system-settings')
        data = {
            'current_academic_year': '2025-2026',
            'current_semester': 2,
            'institute_name': 'Test Institute'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_academic_year'], '2025-2026')
        self.assertEqual(response.data['current_semester'], 2)
    
    def test_invalid_semester(self):
        url = reverse('system-settings')
        data = {'current_semester': 10}
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
