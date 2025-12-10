from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, AttendanceCreateSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'subject_code', 'semester', 'date', 'is_present']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AttendanceCreateSerializer
        return AttendanceRecordSerializer
    
    @action(detail=False, methods=['get'])
    def student_summary(self, request):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        records = AttendanceRecord.objects.filter(student_id=student_id)
        summary = records.values('subject_code', 'subject_name').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(is_present=True))
        )
        
        for item in summary:
            item['percentage'] = (item['present'] / item['total'] * 100) if item['total'] > 0 else 0
        
        return Response({'summary': list(summary)})
