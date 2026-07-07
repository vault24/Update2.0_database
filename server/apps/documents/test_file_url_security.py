"""
Regression test: the document `file_url` must route through the AUTHENTICATED
preview endpoint, never the raw public `/files/` document store (which Nginx now
serves `internal` only). This keeps NID / birth certificates / marksheets from
being fetchable by URL without per-object authorization.
"""
from django.test import TestCase

from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer


class DocumentFileUrlSecurityTests(TestCase):
    def test_file_url_uses_authenticated_endpoint(self):
        doc = Document.objects.create(
            fileName='nid.pdf', filePath='CS/2023/day/student/nid.pdf',
            category='NID', status='active', fileSize=1024, fileType='pdf',
            mimeType='application/pdf')
        data = DocumentSerializer(doc).data
        self.assertNotIn('/files/', data['file_url'])
        self.assertEqual(data['file_url'], f'/api/documents/{doc.id}/preview/')
