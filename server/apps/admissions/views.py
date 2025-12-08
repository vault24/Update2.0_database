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
        if self.action in ['create', 'my_admission']:
            # Students and captains can submit and view their own admission
            return [permissions.IsAuthenticated()]
        else:
            # Admin actions require staff permissions
            return [permissions.IsAdminUser()]
    
    def create(self, request, *args, **kwargs):
        """
        Submit admission application
        POST /api/admissions/
        """
        # Check if user already has an admission
        if hasattr(request.user, 'admission'):
            return Response({
                'error': 'Admission already submitted',
                'details': 'You have already submitted an admission application'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user role is student or captain
        if request.user.role not in ['student', 'captain']:
            return Response({
                'error': 'Invalid role',
                'details': 'Only students and captains can submit admission applications'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admission = serializer.save()
        
        # Return complete admission data
        response_serializer = AdmissionDetailSerializer(admission)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def my_admission(self, request):
        """
        Get current user's admission
        GET /api/admissions/my-admission/
        """
        try:
            admission = request.user.admission
            serializer = AdmissionDetailSerializer(admission)
            return Response(serializer.data)
        except Admission.DoesNotExist:
            return Response({
                'error': 'No admission found',
                'details': 'You have not submitted an admission application yet'
            }, status=status.HTTP_404_NOT_FOUND)
    
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
