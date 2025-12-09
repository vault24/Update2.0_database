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
    - GET /api/admissions/{id}/ - Get admission details
    - POST /api/admissions/{id}/approve/ - Approve admission (admin only)
    - POST /api/admissions/{id}/reject/ - Reject admission (admin only)
    - GET /api/admissions/my-admission/ - Get current user's admission
    """
    queryset = Admission.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'desired_department', 'desired_shift', 'session']
    search_fields = ['full_name_english', 'full_name_bangla', 'email', 'mobile_student']
    ordering_fields = ['submitted_at', 'full_name_english', 'gpa']
    ordering = ['-submitted_at']
    
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
        if self.action in ['create', 'my_admission', 'save_draft', 'get_draft', 'clear_draft']:
            # Students and captains can submit, view, and manage drafts
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
            # Return existing admission instead of error
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
        - current_roll_number
        - current_registration_number
        - semester
        - current_group
        - enrollment_date
        - review_notes (optional)
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
        
        # Create or update student profile
        from apps.students.models import Student
        
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
            'currentRollNumber': serializer.validated_data['current_roll_number'],
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
                'student_id': str(student.id)
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
