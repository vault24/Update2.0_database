"""
Correction Request Views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import CorrectionRequest
from .serializers import (
    CorrectionRequestSerializer,
    CorrectionRequestCreateSerializer,
    CorrectionRequestReviewSerializer
)


class CorrectionRequestViewSet(viewsets.ModelViewSet):
    queryset = CorrectionRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'status', 'field_name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CorrectionRequestCreateSerializer
        elif self.action in ['approve', 'reject']:
            return CorrectionRequestReviewSerializer
        return CorrectionRequestSerializer
    
    def perform_create(self, serializer):
        """
        Set the requesting user when creating a correction request
        """
        serializer.save(requested_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        correction_request = self.get_object()
        
        if correction_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update correction request status
        correction_request.status = 'approved'
        correction_request.reviewed_at = timezone.now()
        correction_request.reviewed_by = request.user
        correction_request.review_notes = serializer.validated_data.get('review_notes', '')
        correction_request.save()
        
        # Apply the correction to the student record
        student = correction_request.student
        field_name = correction_request.field_name
        requested_value = correction_request.requested_value
        
        # Update the student field if it exists
        if hasattr(student, field_name):
            setattr(student, field_name, requested_value)
            student.save()
        
        return Response(
            CorrectionRequestSerializer(correction_request).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        correction_request = self.get_object()
        
        if correction_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update correction request status
        correction_request.status = 'rejected'
        correction_request.reviewed_at = timezone.now()
        correction_request.reviewed_by = request.user
        correction_request.review_notes = serializer.validated_data.get('review_notes', '')
        correction_request.save()
        
        return Response(
            CorrectionRequestSerializer(correction_request).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response(
                {'error': 'Student ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        requests = CorrectionRequest.objects.filter(student_id=student_id)
        serializer = CorrectionRequestSerializer(requests, many=True)
        return Response({'requests': serializer.data})
