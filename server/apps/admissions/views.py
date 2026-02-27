"""
Admission Views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import Admission
from .serializers import (
    AdmissionListSerializer,
    AdmissionDetailSerializer,
    AdmissionCreateSerializer,
    AdmissionApproveSerializer,
    AdmissionRejectSerializer
)


class AdmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Admission CRUD operations
    
    Endpoints:
    - POST /api/admissions/ - Submit admission application (student/captain)
    - GET /api/admissions/ - List all admissions (admin only)
    - GET /api/admissions/{id}/ - Get admission details (accepts UUID or application_id)
    - POST /api/admissions/{id}/approve/ - Approve admission (admin only, accepts UUID or application_id)
    - POST /api/admissions/{id}/reject/ - Reject admission (admin only, accepts UUID or application_id)
    - GET /api/admissions/my-admission/ - Get current user's admission
    """
    queryset = Admission.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'desired_department', 'desired_shift', 'session']
    search_fields = ['full_name_english', 'full_name_bangla', 'email', 'mobile_student', 'application_id']
    ordering_fields = ['submitted_at', 'full_name_english', 'gpa']
    ordering = ['-submitted_at']
    
    def get_object(self):
        """
        Override to support lookup by both UUID (pk) and application_id
        This allows URLs to work with both formats:
        - /api/admissions/a1fe42e7-53c3-4c34-a66e-4eead461a186/ (UUID)
        - /api/admissions/SIPI-889900/ (application_id)
        """
        lookup_value = self.kwargs.get('pk')
        
        # Try UUID lookup first (for backward compatibility and admin operations)
        try:
            import uuid
            # Validate if it's a valid UUID format
            uuid.UUID(str(lookup_value))
            return Admission.objects.get(id=lookup_value)
        except (ValueError, TypeError):
            # Not a valid UUID format, try application_id lookup
            try:
                return Admission.objects.get(application_id=lookup_value)
            except Admission.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound(f'Admission with application_id "{lookup_value}" not found')
        except Admission.DoesNotExist:
            # Valid UUID but not found, try application_id as fallback
            try:
                return Admission.objects.get(application_id=lookup_value)
            except Admission.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound(f'Admission with id "{lookup_value}" not found')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return AdmissionListSerializer
        elif self.action == 'create':
            return AdmissionCreateSerializer
        elif self.action == 'approve':
            return AdmissionApproveSerializer
        elif self.action == 'reject':
            return AdmissionRejectSerializer
        else:
            return AdmissionDetailSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'my_admission', 'save_draft', 'get_draft', 'clear_draft', 'upload_documents', 'reapply', 'check_existing']:
            # Students and captains can submit, view, manage drafts, upload documents, and reapply
            return [permissions.IsAuthenticated()]
        else:
            # Admin actions require staff permissions
            return [permissions.IsAdminUser()]
    
    def create(self, request, *args, **kwargs):
        """
        Submit admission application
        POST /api/admissions/
        """
        # Check if user already has a submitted admission (not draft)
        existing_admission = Admission.objects.filter(
            user=request.user,
            is_draft=False
        ).first()
        
        if existing_admission:
            # If admission is rejected and status is pending (after reapply), allow update
            if existing_admission.status == 'pending':
                # Update the existing admission with new data
                serializer = self.get_serializer(existing_admission, data=request.data, partial=False)
                serializer.is_valid(raise_exception=True)
                admission = serializer.save()
                
                # Update submission timestamp
                admission.submitted_at = timezone.now()
                admission.save()
                
                response_serializer = AdmissionDetailSerializer(admission)
                return Response({
                    'message': 'Application updated successfully',
                    'admission': response_serializer.data
                }, status=status.HTTP_200_OK)
            
            # For approved or already pending (not reapplied), return existing
            response_serializer = AdmissionDetailSerializer(existing_admission)
            return Response({
                'message': 'Admission already submitted',
                'admission': response_serializer.data
            }, status=status.HTTP_200_OK)
        
        # Check if user role is student or captain
        if request.user.role not in ['student', 'captain']:
            return Response({
                'error': 'Invalid role',
                'details': 'Only students and captains can submit admission applications'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Clear any existing draft
        Admission.objects.filter(user=request.user, is_draft=True).delete()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admission = serializer.save()
        
        # Return complete admission data
        response_serializer = AdmissionDetailSerializer(admission)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def my_admission(self, request):
        """
        Get current user's admission (submitted, not draft)
        GET /api/admissions/my-admission/
        """
        try:
            admission = Admission.objects.get(user=request.user, is_draft=False)
            serializer = AdmissionDetailSerializer(admission)
            return Response(serializer.data)
        except Admission.DoesNotExist:
            return Response({
                'error': 'No admission found',
                'details': 'You have not submitted an admission application yet'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], url_path='save-draft')
    def save_draft(self, request):
        """
        Save admission form draft
        POST /api/admissions/save-draft/
        
        Request body:
        {
            "draft_data": {...},  // Form data
            "current_step": 1     // Current step number
        }
        """
        draft_data = request.data.get('draft_data', {}) or {}
        current_step = int(request.data.get('current_step', 1) or 1)

        stored_draft = {
            'formData': draft_data,
            'current_step': current_step,
        }
        
        # Get or create draft admission for user
        admission, created = Admission.objects.get_or_create(
            user=request.user,
            is_draft=True,
            defaults={
                'draft_data': stored_draft,
                'draft_updated_at': timezone.now()
            }
        )
        
        if not created:
            # Update existing draft
            admission.draft_data = stored_draft
            admission.draft_updated_at = timezone.now()
            admission.save()
        
        return Response({
            'id': str(admission.id),
            'draft_data': stored_draft.get('formData', {}),
            'current_step': stored_draft.get('current_step', current_step),
            'saved_at': admission.draft_updated_at.isoformat() if admission.draft_updated_at else None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='get-draft')
    def get_draft(self, request):
        """
        Retrieve admission form draft
        GET /api/admissions/get-draft/
        """
        try:
            admission = Admission.objects.get(user=request.user, is_draft=True)
            stored_draft = admission.draft_data or {}
            form_data = stored_draft.get('formData', stored_draft) or {}
            current_step = stored_draft.get('current_step') or stored_draft.get('currentStep') or 1
            return Response({
                'id': str(admission.id),
                'draft_data': form_data,
                'current_step': current_step,
                'saved_at': admission.draft_updated_at.isoformat() if admission.draft_updated_at else None
            }, status=status.HTTP_200_OK)
        except Admission.DoesNotExist:
            return Response({
                'error': 'No draft found',
                'details': 'You have not saved any draft yet'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['delete'], url_path='clear-draft')
    def clear_draft(self, request):
        """
        Clear admission form draft
        DELETE /api/admissions/clear-draft/
        """
        try:
            admission = Admission.objects.get(user=request.user, is_draft=True)
            admission.delete()
            return Response({
                'message': 'Draft cleared successfully'
            }, status=status.HTTP_200_OK)
        except Admission.DoesNotExist:
            return Response({
                'message': 'No draft to clear'
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve admission and create student profile
        POST /api/admissions/{id}/approve/
        
        Required fields:
        - current_registration_number
        - semester
        - current_group
        - enrollment_date
        - review_notes (optional)
        
        Note: current_roll_number is automatically generated from SSC Board Roll (SIPI-{ssc_roll})
        """
        admission = self.get_object()
        
        # Check if already approved
        if admission.status == 'approved':
            return Response({
                'error': 'Already approved',
                'details': 'This admission has already been approved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = AdmissionApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Generate college roll number
        # Format: Department code + Year + Sequential number
        # Example: CST-2024-001, CST-2024-002, etc.
        from apps.students.models import Student
        
        # Get department code
        dept_code = admission.desired_department.code if admission.desired_department else 'GEN'
        
        # Get year from session (e.g., "2024-25" -> "2024")
        year = admission.session.split('-')[0] if admission.session else '2024'
        
        # Find the next sequential number for this department and year
        existing_students = Student.objects.filter(
            department=admission.desired_department,
            session=admission.session
        ).count()
        
        # Generate roll number with zero-padding
        sequential_num = str(existing_students + 1).zfill(3)
        current_roll_number = f"{dept_code}-{year}-{sequential_num}"
        
        # Ensure uniqueness (in case of race conditions)
        counter = 1
        original_roll = current_roll_number
        while Student.objects.filter(currentRollNumber=current_roll_number).exists():
            counter += 1
            sequential_num = str(existing_students + counter).zfill(3)
            current_roll_number = f"{dept_code}-{year}-{sequential_num}"
        
        # Create or update student profile
        
        student_data = {
            # Personal Information
            'fullNameBangla': admission.full_name_bangla,
            'fullNameEnglish': admission.full_name_english,
            'fatherName': admission.father_name,
            'fatherNID': admission.father_nid,
            'motherName': admission.mother_name,
            'motherNID': admission.mother_nid,
            'dateOfBirth': admission.date_of_birth,
            'birthCertificateNo': admission.birth_certificate_no,
            'gender': admission.gender,
            'religion': admission.religion,
            'bloodGroup': admission.blood_group,
            'nationality': admission.nationality or 'Bangladeshi',
            # Contact Information
            'mobileStudent': admission.mobile_student,
            'guardianMobile': admission.guardian_mobile,
            'email': admission.email,
            'emergencyContact': admission.emergency_contact,
            'presentAddress': admission.present_address,
            'permanentAddress': admission.permanent_address,
            # Educational Background
            'highestExam': admission.highest_exam,
            'board': admission.board,
            'group': admission.group,
            'rollNumber': admission.roll_number,
            'registrationNumber': admission.registration_number,
            'passingYear': admission.passing_year,
            'gpa': admission.gpa,
            'institutionName': admission.institution_name,
            # Current Academic Information
            'currentRollNumber': current_roll_number,
            'currentRegistrationNumber': serializer.validated_data['current_registration_number'],
            'semester': serializer.validated_data['semester'],
            'department': admission.desired_department,
            'session': admission.session,
            'shift': admission.desired_shift,
            'currentGroup': serializer.validated_data['current_group'],
            'status': 'active',
            'enrollmentDate': serializer.validated_data['enrollment_date'],
        }
        
        try:
            student = Student.objects.create(**student_data)
            
            # Update admission status
            admission.status = 'approved'
            admission.reviewed_at = timezone.now()
            admission.reviewed_by = request.user
            admission.review_notes = serializer.validated_data.get('review_notes', '')
            admission.save()
            
            # Update user admission status and link to student profile
            admission.user.admission_status = 'approved'
            admission.user.related_profile_id = student.id
            admission.user.save()
            
            # Return updated admission
            response_serializer = AdmissionDetailSerializer(admission)
            return Response({
                'message': 'Admission approved successfully',
                'admission': response_serializer.data,
                'student_id': str(student.id),
                'roll_number': current_roll_number
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to create student profile',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject admission
        POST /api/admissions/{id}/reject/
        
        Required fields:
        - review_notes: Reason for rejection
        """
        admission = self.get_object()
        
        # Check if already processed
        if admission.status in ['approved', 'rejected']:
            return Response({
                'error': 'Already processed',
                'details': f'This admission has already been {admission.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = AdmissionRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update admission status
        admission.status = 'rejected'
        admission.reviewed_at = timezone.now()
        admission.reviewed_by = request.user
        admission.review_notes = serializer.validated_data['review_notes']
        admission.save()
        
        # Update user admission status
        admission.user.admission_status = 'rejected'
        admission.user.save()
        
        # Return updated admission
        response_serializer = AdmissionDetailSerializer(admission)
        return Response({
            'message': 'Admission rejected',
            'admission': response_serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='reapply')
    def reapply(self, request):
        """
        Allow student to reapply after rejection
        POST /api/admissions/reapply/
        
        This resets the rejected admission to pending status and allows editing
        """
        try:
            # Get the user's rejected admission
            admission = Admission.objects.get(user=request.user, status='rejected')
            
            # Reset to pending status
            admission.status = 'pending'
            admission.reviewed_at = None
            admission.reviewed_by = None
            admission.review_notes = ''
            admission.submitted_at = timezone.now()  # Update submission time
            admission.save()
            
            # Update user's admission status
            request.user.admission_status = 'pending'
            request.user.save()
            
            return Response({
                'message': 'You can now edit and resubmit your application',
                'admission': AdmissionDetailSerializer(admission).data
            }, status=status.HTTP_200_OK)
            
        except Admission.DoesNotExist:
            return Response({
                'error': 'No rejected admission found',
                'details': 'You do not have a rejected admission to reapply'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], url_path='upload-documents')
    def upload_documents(self, request):
        """
        Upload documents for admission
        
        POST /api/admissions/upload-documents/
        
        Request body (FormData):
        - admission_id: UUID of the admission
        - documents[fieldName]: File objects for each document field
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Handle both request.data and request.POST for admission_id
        admission_id = request.data.get('admission_id') or request.POST.get('admission_id')
        
        logger.info(f"Upload documents called with admission_id: {admission_id}")
        
        if not admission_id:
            return Response({
                'error': 'Missing admission_id',
                'details': 'admission_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get the admission - handle both UUID and application_id
            try:
                import uuid as uuid_module
                # Try as UUID first
                uuid_module.UUID(str(admission_id))
                admission = Admission.objects.get(id=admission_id)
            except (ValueError, TypeError):
                # Not a valid UUID, try as application_id
                logger.info(f"Not a UUID, trying as application_id: {admission_id}")
                admission = Admission.objects.get(application_id=admission_id)
            
            logger.info(f"Found admission: {admission.id} for user: {request.user.username}")
            
            # Check permissions - user must own the admission or be admin
            if admission.user != request.user and not request.user.is_staff:
                return Response({
                    'error': 'Permission denied',
                    'details': 'You can only upload documents for your own admission'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Extract documents from request.FILES
            document_files = {}
            for key, file_obj in request.FILES.items():
                # Handle both formats: documents[fieldName] and direct fieldName
                if key.startswith('documents[') and key.endswith(']'):
                    field_name = key[10:-1]  # Remove 'documents[' and ']'
                else:
                    field_name = key
                
                document_files[field_name] = file_obj
            
            logger.info(f"Received {len(document_files)} documents: {list(document_files.keys())}")
            
            if not document_files:
                return Response({
                    'error': 'No documents provided',
                    'details': 'At least one document file is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate document fields
            valid_fields = [
                'photo', 'sscMarksheet', 'sscCertificate', 'birthCertificateDoc',
                'studentNIDCopy', 'fatherNIDFront', 'fatherNIDBack', 
                'motherNIDFront', 'motherNIDBack', 'testimonial',
                'medicalCertificate', 'quotaDocument', 'extraCertificates'
            ]
            
            invalid_fields = [field for field in document_files.keys() if field not in valid_fields]
            if invalid_fields:
                return Response({
                    'error': 'Invalid document fields',
                    'details': f'Invalid fields: {invalid_fields}. Valid fields: {valid_fields}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process documents using the admission model method
            logger.info(f"Processing documents for admission {admission.id}")
            success = admission.process_documents(document_files)
            
            if success:
                logger.info(f"Documents processed successfully for admission {admission.id}")
                # Return success response with updated admission
                response_serializer = AdmissionDetailSerializer(admission)
                return Response({
                    'message': 'Documents uploaded successfully',
                    'documents_processed': True,
                    'processed_count': len(document_files),
                    'admission': response_serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Document processing failed: {admission.document_processing_errors}")
                # Return error response with details
                return Response({
                    'error': 'Document processing failed',
                    'details': admission.document_processing_errors,
                    'documents_processed': False,
                    'processed_count': 0
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Admission.DoesNotExist:
            logger.error(f"Admission not found with id/application_id: {admission_id}")
            return Response({
                'error': 'Admission not found',
                'details': 'The specified admission does not exist'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception(f"Unexpected error in upload_documents: {str(e)}")
            return Response({
                'error': 'Unexpected error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
