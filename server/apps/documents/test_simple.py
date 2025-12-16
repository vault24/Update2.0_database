"""
Simple test for document-admission linkage
"""
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.admissions.models import Admission
from apps.departments.models import Department

User = get_user_model()


class SimpleDocumentTest(TestCase):
    """
    Simple test for document functionality
    """
    
    def setUp(self):
        """Set up test data"""
        # Create a test department
        self.department = Department.objects.create(
            name="Computer Science",
            code="CSE"
        )
        
        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="student"
        )
    
    def test_document_admission_linkage_basic(self):
        """
        Feature: document-upload-persistence-fix, Property 18: Admission-document linkage
        
        Basic test for document-admission linkage functionality.
        """
        # Test data
        file_content = b'test file content'
        file_name = 'test_photo.jpg'
        field_name = 'photo'
        
        # Create admission
        admission = Admission.objects.create(
            user=self.user,
            full_name_english="Test Student",
            desired_department=self.department,
            status='pending'
        )
        
        # Create a test file
        test_file = SimpleUploadedFile(
            name=file_name,
            content=file_content,
            content_type='image/jpeg'
        )
        
        # Process documents through admission
        document_files = {field_name: test_file}
        success = admission.process_documents(document_files)
        
        # Verify the linkage properties
        self.assertTrue(success, f"Document processing should succeed for {field_name}")
        
        # Check that document was created
        documents = Document.objects.filter(
            source_type='admission',
            source_id=admission.id,
            original_field_name=field_name
        )
        
        self.assertTrue(documents.exists(), f"Document should be created for field {field_name}")
        
        document = documents.first()
        
        # Verify linkage properties
        self.assertEqual(document.source_type, 'admission', "Document should have admission source type")
        self.assertEqual(document.source_id, admission.id, "Document should be linked to admission ID")
        self.assertEqual(document.original_field_name, field_name, "Document should preserve original field name")
        
        # Verify admission was updated
        admission.refresh_from_db()
        self.assertTrue(admission.documents_processed, "Admission should be marked as documents processed")
        self.assertIn(field_name, admission.documents, "Admission should contain document path reference")
        
        # Verify file was actually saved
        self.assertTrue(document.filePath, "Document should have a file path")
        self.assertEqual(document.fileName, file_name, "Document should preserve original file name")
        self.assertEqual(document.fileSize, len(file_content), "Document should have correct file size")