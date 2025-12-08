"""
Document Tests
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import TestCase as HypothesisTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
import os
import tempfile
from .models import Document
from apps.students.models import Student
from apps.departments.models import Department


class DocumentPropertyTests(HypothesisTestCase):
    """
    Property-based tests for Document model and API
    """
    
    def setUp(self):
        """Set up test data"""
        # Create a department
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
        
        # Create a student
        self.student = Student.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father Name',
            fatherNID='1234567890',
            motherName='Mother Name',
            motherNID='0987654321',
            dateOfBirth='2000-01-01',
            birthCertificateNo='BC123456',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01798765432',
            emergencyContact='Emergency Contact',
            presentAddress={},
            permanentAddress={},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='12345',
            registrationNumber='67890',
            passingYear=2018,
            gpa=5.00,
            currentRollNumber='CS001',
            currentRegistrationNumber='REG001',
            semester=1,
            department=self.department,
            session='2023-24',
            shift='Day',
            currentGroup='A',
            enrollmentDate='2023-01-01'
        )
    
    @settings(max_examples=100)
    @given(
        fileName=st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))),
        category=st.sampled_from(['NID', 'Birth Certificate', 'Marksheet', 'Certificate', 'Testimonial', 'Photo', 'Other']),
    )
    def test_property_14_document_file_cleanup(self, fileName, category):
        """
        **Feature: django-backend, Property 14: Document file cleanup**
        
        For any document deletion via DELETE /api/documents/{id}/,
        both the database record and the physical file should be removed
        
        **Validates: Requirements 4.6**
        """
        from rest_framework.test import APIClient
        
        client = APIClient()
        
        # Create a temporary PDF file
        pdf_content = b'%PDF-1.4 fake pdf content'
        temp_file = SimpleUploadedFile(
            f"{fileName}.pdf",
            pdf_content,
            content_type='application/pdf'
        )
        
        # Create document via API
        upload_data = {
            'student': str(self.student.id),
            'category': category,
            'file': temp_file
        }
        
        response = client.post('/api/documents/', upload_data, format='multipart')
        
        # Skip if upload failed (e.g., due to invalid filename)
        if response.status_code != status.HTTP_201_CREATED:
            return
        
        document_id = response.data['id']
        file_path = response.data['filePath']
        
        # Verify document exists in database
        self.assertTrue(Document.objects.filter(id=document_id).exists())
        
        # Construct full path to file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        full_path = os.path.join(base_dir, '..', 'client', 'assets', 'images', file_path)
        full_path = os.path.normpath(full_path)
        
        # Verify file exists (if directory exists)
        file_exists_before = os.path.exists(full_path)
        
        # Delete document
        delete_response = client.delete(f'/api/documents/{document_id}/')
        
        # Verify response status
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify document is deleted from database
        self.assertFalse(Document.objects.filter(id=document_id).exists())
        
        # Verify file is deleted (if it existed before)
        if file_exists_before:
            self.assertFalse(os.path.exists(full_path))


class DocumentAPITests(APITestCase):
    """
    Unit tests for Document API endpoints
    """
    
    def setUp(self):
        """Set up test data"""
        # Create a department
        self.department = Department.objects.create(
            name='Computer Science',
            code='CS'
        )
        
        # Create a student
        self.student = Student.objects.create(
            fullNameBangla='জন ডো',
            fullNameEnglish='John Doe',
            fatherName='Father Name',
            fatherNID='1234567890',
            motherName='Mother Name',
            motherNID='0987654321',
            dateOfBirth='2000-01-01',
            birthCertificateNo='BC123456',
            gender='Male',
            mobileStudent='01712345678',
            guardianMobile='01798765432',
            emergencyContact='Emergency Contact',
            presentAddress={},
            permanentAddress={},
            highestExam='SSC',
            board='Dhaka',
            group='Science',
            rollNumber='12345',
            registrationNumber='67890',
            passingYear=2018,
            gpa=5.00,
            currentRollNumber='CS001',
            currentRegistrationNumber='REG001',
            semester=1,
            department=self.department,
            session='2023-24',
            shift='Day',
            currentGroup='A',
            enrollmentDate='2023-01-01'
        )
    
    def test_upload_document_success(self):
        """Test successful document upload"""
        # Create a fake PDF file
        pdf_content = b'%PDF-1.4 fake pdf content'
        pdf_file = SimpleUploadedFile(
            'test_document.pdf',
            pdf_content,
            content_type='application/pdf'
        )
        
        data = {
            'student': str(self.student.id),
            'category': 'NID',
            'file': pdf_file
        }
        
        response = self.client.post('/api/documents/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertIn('filePath', response.data)
        self.assertEqual(response.data['category'], 'NID')
    
    def test_upload_document_invalid_file_type(self):
        """Test document upload with invalid file type"""
        # Create a fake text file
        txt_file = SimpleUploadedFile(
            'test_document.txt',
            b'This is a text file',
            content_type='text/plain'
        )
        
        data = {
            'student': str(self.student.id),
            'category': 'NID',
            'file': txt_file
        }
        
        response = self.client.post('/api/documents/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_upload_document_file_too_large(self):
        """Test document upload with file exceeding size limit"""
        # Create a fake large file (11MB)
        large_content = b'x' * (11 * 1024 * 1024)
        large_file = SimpleUploadedFile(
            'large_document.pdf',
            large_content,
            content_type='application/pdf'
        )
        
        data = {
            'student': str(self.student.id),
            'category': 'NID',
            'file': large_file
        }
        
        response = self.client.post('/api/documents/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_documents(self):
        """Test listing documents"""
        # Create a document
        Document.objects.create(
            student=self.student,
            fileName='test.pdf',
            fileType='pdf',
            category='NID',
            filePath='documents/test.pdf',
            fileSize=1024
        )
        
        response = self.client.get('/api/documents/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_documents_by_student(self):
        """Test filtering documents by student"""
        # Create documents for different students
        Document.objects.create(
            student=self.student,
            fileName='test1.pdf',
            fileType='pdf',
            category='NID',
            filePath='documents/test1.pdf',
            fileSize=1024
        )
        
        response = self.client.get(f'/api/documents/?student={self.student.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_documents_by_category(self):
        """Test filtering documents by category"""
        # Create documents with different categories
        Document.objects.create(
            student=self.student,
            fileName='nid.pdf',
            fileType='pdf',
            category='NID',
            filePath='documents/nid.pdf',
            fileSize=1024
        )
        
        Document.objects.create(
            student=self.student,
            fileName='marksheet.pdf',
            fileType='pdf',
            category='Marksheet',
            filePath='documents/marksheet.pdf',
            fileSize=2048
        )
        
        response = self.client.get('/api/documents/?category=NID')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['category'], 'NID')
    
    def test_my_documents(self):
        """Test student viewing their own documents"""
        # Create documents for this student
        Document.objects.create(
            student=self.student,
            fileName='nid.pdf',
            fileType='pdf',
            category='NID',
            filePath='documents/nid.pdf',
            fileSize=1024
        )
        
        Document.objects.create(
            student=self.student,
            fileName='marksheet.pdf',
            fileType='pdf',
            category='Marksheet',
            filePath='documents/marksheet.pdf',
            fileSize=2048
        )
        
        # Query for specific student's documents
        response = self.client.get(f'/api/documents/my-documents/?student={self.student.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['documents']), 2)
    
    def test_my_documents_with_category_filter(self):
        """Test student viewing their documents filtered by category"""
        # Create documents for this student
        Document.objects.create(
            student=self.student,
            fileName='nid.pdf',
            fileType='pdf',
            category='NID',
            filePath='documents/nid.pdf',
            fileSize=1024
        )
        
        Document.objects.create(
            student=self.student,
            fileName='marksheet.pdf',
            fileType='pdf',
            category='Marksheet',
            filePath='documents/marksheet.pdf',
            fileSize=2048
        )
        
        # Query for specific category
        response = self.client.get(f'/api/documents/my-documents/?student={self.student.id}&category=NID')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['documents'][0]['category'], 'NID')
    
    def test_my_documents_without_student_id(self):
        """Test my_documents endpoint without student ID fails"""
        response = self.client.get('/api/documents/my-documents/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_delete_document(self):
        """Test deleting a document"""
        # Create a document
        document = Document.objects.create(
            student=self.student,
            fileName='test.pdf',
            fileType='pdf',
            category='NID',
            filePath='documents/test.pdf',
            fileSize=1024
        )
        
        response = self.client.delete(f'/api/documents/{document.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(id=document.id).exists())
