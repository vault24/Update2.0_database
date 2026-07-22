"""
Exam Routine API.

Admin (IsAdminRole):
    POST   /api/routines/imports/           upload a BTEB routine PDF
    GET    /api/routines/imports/           import history
    GET    /api/routines/imports/<id>/      one import + stats
    GET    /api/routines/imports/<id>/issues/  parser issues
    DELETE /api/routines/imports/<id>/      remove an import

Student portal (authenticated student):
    GET    /api/routines/my/?type=final     personalized routine
"""
import hashlib
import logging
import threading

from django.db import close_old_connections
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdminRole
from apps.students.models import Student

from .importer import AlreadyImportedError, import_routine_pdf
from .models import RoutineImport, RoutineParserIssue
from .serializers import RoutineImportSerializer, RoutineParserIssueSerializer

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 50 * 1024 * 1024


class RoutineImportListCreateView(APIView):
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        imports = RoutineImport.objects.select_related('uploadedBy')[:50]
        return Response(RoutineImportSerializer(imports, many=True).data)

    def post(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            return Response({'error': 'Attach the routine PDF as "file".'},
                            status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_UPLOAD_BYTES:
            return Response({'error': 'File exceeds the 50 MB limit.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not upload.name.lower().endswith('.pdf'):
            return Response({'error': 'Only PDF files are accepted.'},
                            status=status.HTTP_400_BAD_REQUEST)

        file_bytes = upload.read()
        replace = str(request.data.get('replace', '')).lower() in ('1', 'true', 'yes')
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        existing = RoutineImport.objects.filter(fileSha256=sha256, status='completed').first()
        if existing is not None and not replace:
            return Response(
                {'error': 'This routine PDF was already imported.',
                 'importId': str(existing.id)},
                status=status.HTTP_409_CONFLICT,
            )

        started = threading.Event()

        def run():
            close_old_connections()
            try:
                import_routine_pdf(
                    file_bytes=file_bytes, file_name=upload.name,
                    uploaded_by=request.user, replace=replace,
                )
            except AlreadyImportedError:
                pass
            except Exception:
                logger.exception('Background routine import failed')
            finally:
                started.set()
                close_old_connections()

        threading.Thread(target=run, daemon=True).start()
        started.wait(timeout=0.5)
        record = RoutineImport.objects.filter(fileSha256=sha256).order_by('-createdAt').first()
        return Response(
            {'message': 'Import started. Poll the import for progress.',
             'importId': str(record.id) if record else None},
            status=status.HTTP_202_ACCEPTED,
        )


class RoutineImportDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get_object(self, import_id):
        try:
            return RoutineImport.objects.select_related('uploadedBy').get(id=import_id)
        except (RoutineImport.DoesNotExist, ValueError):
            return None

    def get(self, request, import_id):
        record = self.get_object(import_id)
        if record is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(RoutineImportSerializer(record).data)

    def delete(self, request, import_id):
        record = self.get_object(import_id)
        if record is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoutineImportIssuesView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, import_id):
        issues = RoutineParserIssue.objects.filter(routine_id=import_id)
        severity = request.query_params.get('severity')
        if severity:
            issues = issues.filter(severity=severity)
        return Response(RoutineParserIssueSerializer(issues[:500], many=True).data)


class MyRoutineView(APIView):
    """The logged-in student's personalized exam routine."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .generation import generate_for_student

        user = request.user
        if not getattr(user, 'can_access_student_portal', lambda: False)():
            return Response(status=status.HTTP_403_FORBIDDEN)
        student = Student.objects.select_related('department').filter(
            id=user.related_profile_id,
        ).first()
        if student is None:
            return Response(
                {'error': 'No student profile linked to this account.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        exam_type = (request.query_params.get('type') or 'final').lower()
        if exam_type not in ('final', 'mid'):
            exam_type = 'final'
        payload = generate_for_student(student, exam_type)
        payload['student'] = {
            'name': student.fullNameEnglish,
            'roll': student.currentRollNumber,
            'semester': student.semester,
            'department': student.department.name if student.department_id else '',
        }
        return Response(payload)
