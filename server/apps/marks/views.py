from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import MarksRecord
from .serializers import MarksRecordSerializer, MarksCreateSerializer


class MarksViewSet(viewsets.ModelViewSet):
    queryset = MarksRecord.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'subject_code', 'semester', 'exam_type']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MarksCreateSerializer
        return MarksRecordSerializer
    
    @action(detail=False, methods=['post'])
    def bulk_upsert(self, request):
        """
        Create/update many marks records in one request.

        POST /api/marks/bulk_upsert/
        Body: { "records": [ {id?, student, subject_code, subject_name, semester,
                              exam_type, marks_obtained, total_marks, remarks}, ... ] }
        Records with an `id` are updated; the rest are created.
        """
        records = request.data.get('records', [])
        if not isinstance(records, list) or not records:
            return Response({'error': 'No records provided'}, status=status.HTTP_400_BAD_REQUEST)

        saved, errors = [], []
        for idx, item in enumerate(records):
            try:
                marks_obtained = float(item.get('marks_obtained') or 0)
                total_marks = float(item.get('total_marks') or 0)
                if marks_obtained < 0:
                    raise ValueError('Marks obtained cannot be negative')
                if total_marks and marks_obtained > total_marks:
                    raise ValueError('Marks obtained cannot exceed total marks')

                record_id = item.get('id')
                if record_id:
                    instance = MarksRecord.objects.filter(id=record_id).first()
                    if not instance:
                        raise ValueError(f'Marks record not found: {record_id}')
                    serializer = MarksRecordSerializer(instance, data={
                        'marks_obtained': marks_obtained,
                        'total_marks': total_marks,
                        'remarks': item.get('remarks', instance.remarks),
                    }, partial=True)
                else:
                    serializer = MarksCreateSerializer(data={
                        'student': item.get('student'),
                        'subject_code': item.get('subject_code', ''),
                        'subject_name': item.get('subject_name', ''),
                        'semester': item.get('semester'),
                        'exam_type': item.get('exam_type', ''),
                        'marks_obtained': marks_obtained,
                        'total_marks': total_marks,
                        'remarks': item.get('remarks', ''),
                    })
                serializer.is_valid(raise_exception=True)
                if record_id:
                    instance = serializer.save()
                else:
                    instance = serializer.save(
                        recorded_by=request.user if getattr(request.user, 'is_authenticated', False) else None
                    )
                saved.append(instance)
            except Exception as e:
                errors.append({'index': idx, 'student': str(item.get('student', '')), 'error': str(e)})

        response = {
            'saved': len(saved),
            'errors': errors,
            'records': MarksRecordSerializer(saved, many=True).data,
        }
        if errors and not saved:
            return Response(response, status=status.HTTP_400_BAD_REQUEST)
        if errors:
            return Response(response, status=status.HTTP_207_MULTI_STATUS)
        return Response(response, status=status.HTTP_201_CREATED)

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
