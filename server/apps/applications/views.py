"""
Application Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Application
from .serializers import (
    ApplicationSerializer,
    ApplicationSubmitSerializer,
    ApplicationReviewSerializer
)


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing applications
    
    Provides CRUD operations and custom actions for application submission and review
    """
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'applicationType', 'department']
    ordering_fields = ['submittedAt', 'reviewedAt']
    ordering = ['-submittedAt']
    
    @action(detail=False, methods=['post'], permission_classes=[])
    def submit(self, request):
        """
        Public endpoint for submitting applications (no authentication required)
        
        POST /api/applications/submit/
        """
        serializer = ApplicationSubmitSerializer(data=request.data)
        if serializer.is_valid():
            application = serializer.save()
            response_serializer = ApplicationSerializer(application)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Admin endpoint for approving applications
        
        POST /api/applications/{id}/approve/
        
        Request body:
        {
            "reviewedBy": "Admin Name",
            "reviewNotes": "Optional notes"
        }
        """
        application = self.get_object()
        
        # Check if already reviewed
        if application.status != 'pending':
            return Response(
                {
                    'error': 'Application already reviewed',
                    'details': f'This application has already been {application.status}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get reviewer information
        reviewed_by = request.data.get('reviewedBy', 'Admin')
        review_notes = request.data.get('reviewNotes', '')
        
        # Update application
        application.status = 'approved'
        application.reviewedBy = reviewed_by
        application.reviewNotes = review_notes
        application.reviewedAt = timezone.now()
        application.save()
        
        response_serializer = ApplicationSerializer(application)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Admin endpoint for rejecting applications
        
        POST /api/applications/{id}/reject/
        
        Request body:
        {
            "reviewedBy": "Admin Name",
            "reviewNotes": "Reason for rejection"
        }
        """
        application = self.get_object()
        
        # Check if already reviewed
        if application.status != 'pending':
            return Response(
                {
                    'error': 'Application already reviewed',
                    'details': f'This application has already been {application.status}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get reviewer information
        reviewed_by = request.data.get('reviewedBy', 'Admin')
        review_notes = request.data.get('reviewNotes', '')
        
        if not review_notes:
            return Response(
                {
                    'error': 'Review notes required',
                    'details': 'Please provide a reason for rejection'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update application
        application.status = 'rejected'
        application.reviewedBy = reviewed_by
        application.reviewNotes = review_notes
        application.reviewedAt = timezone.now()
        application.save()
        
        response_serializer = ApplicationSerializer(application)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """
        Student-specific endpoint to view their own applications
        
        GET /api/applications/my-applications/?rollNumber={rollNumber}
        
        Query params:
        - rollNumber: Student's roll number (required)
        - registrationNumber: Student's registration number (optional, for additional verification)
        """
        roll_number = request.query_params.get('rollNumber')
        registration_number = request.query_params.get('registrationNumber')
        
        if not roll_number:
            return Response(
                {
                    'error': 'Roll number required',
                    'details': 'Please provide rollNumber query parameter'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter applications by roll number
        applications = Application.objects.filter(rollNumber=roll_number)
        
        # Additional filter by registration number if provided
        if registration_number:
            applications = applications.filter(registrationNumber=registration_number)
        
        # Order by submission date (newest first)
        applications = applications.order_by('-submittedAt')
        
        serializer = ApplicationSerializer(applications, many=True)
        return Response({
            'count': applications.count(),
            'applications': serializer.data
        })
    
    @action(detail=True, methods=['put'])
    def review(self, request, pk=None):
        """
        Admin endpoint for reviewing applications (legacy endpoint)
        
        PUT /api/applications/{id}/review/
        
        Note: Use /approve/ or /reject/ endpoints instead for better clarity
        """
        application = self.get_object()
        serializer = ApplicationReviewSerializer(data=request.data)
        
        if serializer.is_valid():
            # Update application with review data
            application.status = serializer.validated_data['status']
            application.reviewedBy = serializer.validated_data['reviewedBy']
            application.reviewNotes = serializer.validated_data.get('reviewNotes', '')
            application.reviewedAt = timezone.now()
            application.save()
            
            response_serializer = ApplicationSerializer(application)
            return Response(response_serializer.data)
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
