from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from .models import MarksRecord
from .serializers import MarksRecordSerializer, MarksCreateSerializer


class MarksViewSet(viewsets.ModelViewSet):
    queryset = MarksRecord.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'subject_code', 'semester', 'exam_type']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MarksCreateSerializer
        return MarksRecordSerializer
    
    @action(detail=False, methods=['get'])
    def student_marks(self, request):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        marks = MarksRecord.objects.filter(student_id=student_id)
        semester = request.query_params.get('semester')
        if semester:
            marks = marks.filter(semester=semester)
        
        serializer = MarksRecordSerializer(marks, many=True)
        return Response({'marks': serializer.data})
