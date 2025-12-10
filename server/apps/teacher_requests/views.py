"""
Teacher Request Views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from django.db import transaction
from .models import TeacherSignupRequest, TeacherRequest


class IsAdminRole(permissions.BasePermission):
    """
    Custom permission to only allow users with admin roles (registrar, institute_head)
    to access admin endpoints.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has admin role
        return request.user.is_admin()
from .serializers import (
    TeacherSignupRequestListSerializer,
    TeacherSignupRequestDetailSerializer,
    TeacherSignupRequestCreateSerializer,
    TeacherSignupApproveSerializer,
    TeacherSignupRejectSerializer,
    TeacherRequestSerializer
)


class TeacherSignupRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Teacher Signup Request operations
    
    Endpoints:
    - POST /api/teachers/signup-request/ - Submit teacher signup request
    - GET /api/teachers/requests/ - List pending teacher requests (admin only)
    - GET /api/teachers/requests/{id}/ - Get request details
    - POST /api/teachers/requests/{id}/approve/ - Approve teacher request (admin only)
    - POST /api/teachers/requests/{id}/reject/ - Reject teacher request (admin only)
    """
    queryset = TeacherSignupRequest.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'department']
    search_fields = ['full_name_english', 'full_name_bangla', 'email', 'designation']
    ordering_fields = ['submitted_at', 'full_name_english']
    ordering = ['-submitted_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TeacherSignupRequestListSerializer
        elif self.action == 'create':
            return TeacherSignupRequestCreateSerializer
        elif self.action == 'approve':
            return TeacherSignupApproveSerializer
        elif self.action == 'reject':
            return TeacherSignupRejectSerializer
        else:
            return TeacherSignupRequestDetailSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action == 'create':
            # Teachers can submit signup requests
            return [permissions.IsAuthenticated()]
        else:
            # Admin actions require admin role (registrar or institute_head)
            return [IsAdminRole()]
    
    def create(self, request, *args, **kwargs):
        """
        Submit teacher signup request
        POST /api/teachers/signup-request/
        """
        # Check if user already has a signup request
        if hasattr(request.user, 'teacher_signup_request'):
            return Response({
                'error': 'Request already submitted',
                'details': 'You have already submitted a teacher signup request'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user role is teacher
        if request.user.role != 'teacher':
            return Response({
                'error': 'Invalid role',
                'details': 'Only teacher accounts can submit signup requests'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signup_request = serializer.save()
        
        # Return complete request data
        response_serializer = TeacherSignupRequestDetailSerializer(signup_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve teacher signup request and create teacher profile
        POST /api/teachers/requests/{id}/approve/
        
        Required fields:
        - joining_date
        - subjects (optional)
        - review_notes (optional)
        """
        signup_request = self.get_object()
        
        # Check if already approved
        if signup_request.status == 'approved':
            return Response({
                'error': 'Already approved',
                'details': 'This request has already been approved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TeacherSignupApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create teacher profile with atomic transaction
        from apps.teachers.models import Teacher
        
        teacher_data = {
            'fullNameBangla': signup_request.full_name_bangla,
            'fullNameEnglish': signup_request.full_name_english,
            'designation': signup_request.designation,
            'department': signup_request.department,
            'subjects': serializer.validated_data.get('subjects', []),
            'qualifications': signup_request.qualifications,
            'specializations': signup_request.specializations,
            'email': signup_request.email,
            'mobileNumber': signup_request.mobile_number,
            'officeLocation': signup_request.office_location or '',
            'employmentStatus': 'active',
            'joiningDate': serializer.validated_data['joining_date'],
        }
        
        try:
            # Use atomic transaction to ensure all operations succeed or fail together
            with transaction.atomic():
                # Create teacher profile
                teacher = Teacher.objects.create(**teacher_data)
                
                # Update signup request status
                signup_request.status = 'approved'
                signup_request.reviewed_at = timezone.now()
                signup_request.reviewed_by = request.user
                signup_request.review_notes = serializer.validated_data.get('review_notes', '')
                signup_request.save()
                
                # Update user account status and link to teacher profile
                signup_request.user.account_status = 'active'
                signup_request.user.related_profile_id = teacher.id
                signup_request.user.save()
            
            # Return updated request
            response_serializer = TeacherSignupRequestDetailSerializer(signup_request)
            return Response({
                'message': 'Teacher signup request approved successfully',
                'request': response_serializer.data,
                'teacher_id': str(teacher.id)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to create teacher profile',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject teacher signup request
        POST /api/teachers/requests/{id}/reject/
        
        Required fields:
        - review_notes: Reason for rejection
        """
        signup_request = self.get_object()
        
        # Check if already processed
        if signup_request.status in ['approved', 'rejected']:
            return Response({
                'error': 'Already processed',
                'details': f'This request has already been {signup_request.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TeacherSignupRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Use atomic transaction for consistency
            with transaction.atomic():
                # Update request status
                signup_request.status = 'rejected'
                signup_request.reviewed_at = timezone.now()
                signup_request.reviewed_by = request.user
                signup_request.review_notes = serializer.validated_data['review_notes']
                signup_request.save()
                
                # User account remains pending (they can try again or contact admin)
                # Ensure user account status is still pending
                if signup_request.user.account_status != 'pending':
                    signup_request.user.account_status = 'pending'
                    signup_request.user.save()
            
            # Return updated request
            response_serializer = TeacherSignupRequestDetailSerializer(signup_request)
            return Response({
                'message': 'Teacher signup request rejected',
                'request': response_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to reject teacher signup request',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeacherRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for student-teacher contact requests
    """
    queryset = TeacherRequest.objects.all()
    serializer_class = TeacherRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'teacher', 'student']
    ordering_fields = ['requestDate']
    ordering = ['-requestDate']
