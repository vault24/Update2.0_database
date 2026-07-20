"""
Result Management API.

Admin (IsAdminRole):
    POST   /api/results/imports/            upload a BTEB PDF (async import)
    GET    /api/results/imports/            import history
    GET    /api/results/imports/<id>/       one import incl. statistics
    GET    /api/results/imports/<id>/issues/  parser/validation issues
    DELETE /api/results/imports/<id>/       remove an import and its data
    GET    /api/results/admin/search/?roll= roll search (any institute)

Student portal (authenticated student):
    GET    /api/results/my/                 own result history

Public (AllowAny, throttled):
    GET    /api/results/public/search/?roll=  roll search

The upload endpoint parses and imports in a background thread — a national
PDF holds 37k+ records and must not depend on proxy timeouts — and the
frontend polls the import row until status becomes completed/failed.
"""
import logging
import threading

from django.db import close_old_connections
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdminRole
from apps.students.models import Student

from .importer import AlreadyImportedError, import_result_pdf
from .models import ParserIssue, ResultImport, StudentResult
from .serializers import (
    ExamSerializer,
    ParserIssueSerializer,
    ResultImportSerializer,
    StudentResultSerializer,
)

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 100 * 1024 * 1024


def _search_payload(roll: str) -> dict:
    """Full result history for one roll, newest exam first."""
    results = (
        StudentResult.objects
        .filter(rollNumber=roll)
        .select_related('exam', 'institute')
        .prefetch_related('semesterGpas', 'subjects')
        .order_by('-exam__regulationYear', '-exam__semester')
    )
    serialized = StudentResultSerializer(results, many=True).data
    latest_cgpa = next((r.cgpa for r in results if r.cgpa is not None), None)
    return {
        'roll': roll,
        'found': bool(serialized),
        'institute': serialized[0]['institute'] if serialized else None,
        # String to match how serializer decimal fields render.
        'finalCgpa': str(latest_cgpa) if latest_cgpa is not None else None,
        'results': serialized,
    }


class ImportListCreateView(APIView):
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        imports = ResultImport.objects.select_related('exam', 'uploadedBy')[:50]
        return Response(ResultImportSerializer(imports, many=True).data)

    def post(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            return Response(
                {'error': 'Attach the official BTEB result PDF as "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_UPLOAD_BYTES:
            return Response(
                {'error': 'File exceeds the 100 MB limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not upload.name.lower().endswith('.pdf'):
            return Response(
                {'error': 'Only PDF files are accepted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_bytes = upload.read()
        replace = str(request.data.get('replace', '')).lower() in ('1', 'true', 'yes')

        # Fast duplicate feedback before going async.
        import hashlib
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        existing = ResultImport.objects.filter(
            fileSha256=sha256, status='completed',
        ).first()
        if existing is not None and not replace:
            return Response(
                {
                    'error': 'This PDF was already imported.',
                    'importId': str(existing.id),
                },
                status=status.HTTP_409_CONFLICT,
            )

        placeholder = {'started': threading.Event(), 'importId': None}

        def run() -> None:
            close_old_connections()
            try:
                record = import_result_pdf(
                    file_bytes=file_bytes,
                    file_name=upload.name,
                    uploaded_by=request.user,
                    replace=replace,
                )
                placeholder['importId'] = str(record.id)
            except AlreadyImportedError:
                pass  # concurrent duplicate upload; the first one wins
            except Exception:
                logger.exception('Background result import failed')
            finally:
                placeholder['started'].set()
                close_old_connections()

        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        # Wait briefly so the ResultImport row exists and we can return its id;
        # the heavy parsing continues in the background.
        placeholder['started'].wait(timeout=0.5)

        record = (
            ResultImport.objects.filter(fileSha256=sha256)
            .order_by('-createdAt')
            .first()
        )
        return Response(
            {
                'message': 'Import started. Poll the import for progress.',
                'importId': str(record.id) if record else placeholder['importId'],
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ImportDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get_object(self, import_id):
        try:
            return ResultImport.objects.select_related('exam', 'uploadedBy').get(id=import_id)
        except (ResultImport.DoesNotExist, ValueError):
            return None

    def get(self, request, import_id):
        record = self.get_object(import_id)
        if record is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ResultImportSerializer(record).data)

    def delete(self, request, import_id):
        record = self.get_object(import_id)
        if record is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        record.delete()  # cascades to results/gpas/subjects/issues
        return Response(status=status.HTTP_204_NO_CONTENT)


class ImportIssuesView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, import_id):
        issues = ParserIssue.objects.filter(importRecord_id=import_id)
        severity = request.query_params.get('severity')
        if severity:
            issues = issues.filter(severity=severity)
        return Response(ParserIssueSerializer(issues[:500], many=True).data)


class AdminRollSearchView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        roll = (request.query_params.get('roll') or '').strip()
        if not roll.isdigit():
            return Response(
                {'error': 'Provide a numeric roll number, e.g. ?roll=612120.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(_search_payload(roll))


class PublicRollSearchView(APIView):
    """Anyone can look up a roll — this is the public result portal."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'result_search'

    def get(self, request):
        roll = (request.query_params.get('roll') or '').strip()
        if not roll.isdigit() or not 4 <= len(roll) <= 10:
            return Response(
                {'error': 'Provide a numeric roll number, e.g. ?roll=612120.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(_search_payload(roll))


def _semester_param(request):
    """Parse a 1–12 semester number from the query string, or None."""
    try:
        semester = int(request.query_params.get('semester', ''))
    except (ValueError, TypeError):
        return None
    return semester if 1 <= semester <= 12 else None


class AnalyticsSemestersView(APIView):
    """Semester numbers (1–8…) that have results for our enrolled students."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        from .analytics import available_semesters

        return Response(available_semesters())


class AnalyticsSummaryView(APIView):
    """Institute / department / national summary for one semester.

    Aggregates across every regulation year — analytics is keyed by semester
    number, and covers only students who have an account in our database.
    """

    permission_classes = [IsAdminRole]

    def get(self, request):
        from .analytics import semester_summary

        semester = _semester_param(request)
        if semester is None:
            return Response(
                {'error': 'Pass a valid ?semester=<1-12>.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(semester_summary(semester))


class AnalyticsDownloadView(APIView):
    """Result-sheet download for one semester, filtered by department + shift.

    GET …/download/?semester=<n>[&department=<uuid>][&shift=Morning][&type=pdf|excel]
    Renders the institute's official tabulation-sheet layout.

    Note: the export type is ``type``, not ``format`` — DRF reserves the
    ``format`` query parameter for content negotiation.
    """

    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.http import HttpResponse

        from .analytics import sheet_rows
        from .reportsheet import render_excel, render_pdf

        semester = _semester_param(request)
        if semester is None:
            return Response(
                {'error': 'Pass a valid ?semester=<1-12>.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        department_id = request.query_params.get('department') or None
        shift = (request.query_params.get('shift') or '').strip()
        fmt = (request.query_params.get('type') or 'pdf').lower()

        sheet = sheet_rows(semester, department_id=department_id, shift=shift)

        base = f"result_sheet_sem{semester}"
        if department_id and sheet['departmentName'] != 'All Departments':
            base += '_' + sheet['departmentName'].split()[0].lower()
        if shift:
            base += f'_{shift.lower()}'

        if fmt == 'excel':
            content = render_excel(sheet)
            response = HttpResponse(
                content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = f'attachment; filename="{base}.xlsx"'
            return response

        content = render_pdf(sheet)
        response = HttpResponse(content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{base}.pdf"'
        return response


class MyResultsView(APIView):
    """The logged-in student's own result history (student portal)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not getattr(user, 'can_access_student_portal', lambda: False)():
            return Response(status=status.HTTP_403_FORBIDDEN)
        student = Student.objects.filter(id=user.related_profile_id).first()
        if student is None:
            return Response(
                {'error': 'No student profile linked to this account.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(_search_payload(student.currentRollNumber))
