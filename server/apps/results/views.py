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


def _attach_subject_info(serialized_results: list) -> None:
    """Enrich each referred/failed subject with the catalog entry (name,
    semester, credit and the full marks distribution) in one query."""
    from .models import Subject

    codes = {
        subject['subjectCode']
        for result in serialized_results
        for subject in result.get('subjects', [])
    }
    if not codes:
        return
    catalog: dict[str, Subject] = {}
    for entry in Subject.objects.filter(code__in=codes):
        # Newer regulation wins when a code exists in more than one.
        existing = catalog.get(entry.code)
        if existing is None or (entry.regulationYear or 0) > (existing.regulationYear or 0):
            catalog[entry.code] = entry
    for result in serialized_results:
        for subject in result.get('subjects', []):
            entry = catalog.get(subject['subjectCode'])
            if entry is None:
                subject['info'] = None
                continue
            subject['info'] = {
                'name': entry.name,
                'semester': entry.semester,
                'credit': entry.credit,
                'technology': entry.technology,
                'regulationYear': entry.regulationYear,
                'theoryContinuous': entry.theoryContinuous,
                'theoryFinal': entry.theoryFinal,
                'theoryTotal': entry.theoryTotal,
                'practicalContinuous': entry.practicalContinuous,
                'practicalFinal': entry.practicalFinal,
                'practicalTotal': entry.practicalTotal,
                'totalMarks': entry.totalMarks,
            }


def _attach_ranks(result_objs: list, serialized: list) -> None:
    """Institute-wise merit rank for each PASSED semester result.

    Rank = position among all students of the same institute in the same
    exam, ordered by that semester's GPA (highest first). Referred/failed
    students (no numeric semester GPA) are not ranked. One query per distinct
    (exam, institute, semester) — a roll's results share an institute, so
    this is a small, bounded number of queries.
    """
    from .models import SemesterGPA

    cohort_cache: dict[tuple, list] = {}
    by_id = {obj.id: obj for obj in result_objs}

    for row in serialized:
        obj = by_id.get(row['id'])
        if obj is None:
            continue
        semester = obj.exam.semester
        own = next(
            (g.gpa for g in obj.semesterGpas.all() if g.semester == semester),
            None,
        )
        if own is None:
            row['rank'] = None
            row['rankTotal'] = None
            continue
        key = (obj.exam_id, obj.institute_id, semester)
        cohort = cohort_cache.get(key)
        if cohort is None:
            cohort = sorted(
                SemesterGPA.objects.filter(
                    result__exam_id=obj.exam_id,
                    result__institute_id=obj.institute_id,
                    semester=semester,
                    gpa__isnull=False,
                ).values_list('gpa', flat=True),
                reverse=True,
            )
            cohort_cache[key] = cohort
        row['rank'] = sum(1 for g in cohort if g > own) + 1
        row['rankTotal'] = len(cohort)


def _search_payload(roll: str) -> dict:
    """Full result history for one roll, newest exam first.

    De-duplicated to ONE result per semester: when BTEB re-publishes a
    corrected notice for the same semester it can land as a second exam row
    (a changed date/memo, or a hair's-difference in the exam-session text),
    and the correction must SUPERSEDE the original — never be merged or shown
    alongside it. The most-recently-published result for each semester wins.
    """
    from datetime import date

    all_results = list(
        StudentResult.objects
        .filter(rollNumber=roll)
        .select_related('exam', 'institute')
        .prefetch_related('semesterGpas', 'subjects')
    )
    # Newest publication first (undated rows sort last), stable by id.
    all_results.sort(
        key=lambda r: (r.exam.publicationDate or date.min, r.id),
        reverse=True,
    )
    seen_semesters: set[int] = set()
    results = []
    for result in all_results:
        if result.exam.semester in seen_semesters:
            continue
        seen_semesters.add(result.exam.semester)
        results.append(result)
    results.sort(key=lambda r: (r.exam.regulationYear, r.exam.semester), reverse=True)

    serialized = StudentResultSerializer(results, many=True).data
    _attach_subject_info(serialized)
    _attach_ranks(results, serialized)
    latest_cgpa = next((r.cgpa for r in results if r.cgpa is not None), None)

    # Student name for our institute's enrolled students (public result
    # sheets in Bangladesh customarily show the name; BTEB notices don't
    # carry names, so this is only available for rolls we know).
    student_name = ''
    if serialized:
        student_name = (
            Student.objects.filter(currentRollNumber=roll)
            .values_list('fullNameEnglish', flat=True)
            .first()
            or ''
        )
    return {
        'roll': roll,
        'found': bool(serialized),
        'studentName': student_name,
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


class SubjectImportView(APIView):
    """Upload a BTEB Probidhan course-structure PDF (subject catalog).

    Parsed synchronously (a handful of pages) and upserted by
    (code, regulation) — re-importing an updated document just refreshes the
    rows. The front-end sends multiple technology PDFs one request at a time,
    like result imports.
    """

    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from .importer import UnparsablePdfError, import_subject_pdf

        upload = request.FILES.get('file')
        if upload is None:
            return Response(
                {'error': 'Attach the course-structure PDF as "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not upload.name.lower().endswith('.pdf'):
            return Response(
                {'error': 'Only PDF files are accepted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stats = import_subject_pdf(
                file_bytes=upload.read(), file_name=upload.name,
            )
        except UnparsablePdfError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(stats)


class SubjectLookupView(APIView):
    """Resolve a subject CODE to its catalog entry (name, semester, credit…).

    Used by the admin routine builder to auto-fill the subject name the moment
    an admin types a code. The catalog stores one row per (code, technology,
    regulation); the NAME is the same for a shared code, so any matching row
    answers the name. When a semester is supplied we prefer the row for that
    semester, so the returned metadata is the most relevant one.

    GET /api/results/subjects/lookup/?code=28541[&semester=4]
    """

    permission_classes = [IsAdminRole]

    def get(self, request):
        from .models import Subject

        code = (request.query_params.get('code') or '').strip()
        if not code:
            return Response(
                {'error': 'Provide a subject code, e.g. ?code=28541.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matches = list(Subject.objects.filter(code__iexact=code))
        if not matches:
            return Response({'found': False, 'code': code})

        # Prefer the row for the requested semester when one is given.
        semester = request.query_params.get('semester')
        chosen = matches[0]
        if semester:
            try:
                sem = int(semester)
                chosen = next((m for m in matches if m.semester == sem), matches[0])
            except (TypeError, ValueError):
                pass

        return Response({
            'found': True,
            'code': chosen.code,
            'name': chosen.name,
            'semester': chosen.semester,
            'credit': chosen.credit,
            'technology': chosen.technology,
            # Distinct semesters this code appears in (helps disambiguation).
            'semesters': sorted({m.semester for m in matches}),
        })


class SubjectStatsView(APIView):
    """Subject-catalog overview for the admin Imports screen."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.db.models import Count, Max

        from .models import Subject

        technologies = list(
            Subject.objects.values('technology', 'techCode', 'regulationYear')
            .annotate(subjects=Count('id'), lastUpdated=Max('updatedAt'))
            .order_by('technology', 'regulationYear')
        )
        return Response({
            'totalSubjects': Subject.objects.count(),
            'technologies': technologies,
        })


class PublicRecentExamsView(APIView):
    """Recent examinations for the public portal landing page.

    Anonymous + cached: this renders on every portal visit, so the (already
    cheap) aggregate is memoised for 10 minutes.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'result_search'

    CACHE_KEY = 'results:public:recent-exams'
    CACHE_SECONDS = 600

    def get(self, request):
        from django.core.cache import cache
        from django.db.models import Count

        from .models import Exam

        payload = cache.get(self.CACHE_KEY)
        if payload is None:
            exams = (
                Exam.objects.annotate(resultCount=Count('results'))
                .filter(resultCount__gt=0)
                .order_by('-publicationDate', '-id')[:8]
            )
            payload = [
                {
                    'semester': exam.semester,
                    'regulationYear': exam.regulationYear,
                    'program': exam.program,
                    'heldIn': exam.heldIn,
                    'publicationDate': exam.publicationDate,
                    'resultCount': exam.resultCount,
                }
                for exam in exams
            ]
            cache.set(self.CACHE_KEY, payload, self.CACHE_SECONDS)
        return Response(payload)


class PublicResultPdfView(APIView):
    """Downloadable PDF of one roll's full result (public portal)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'result_download'

    def get(self, request):
        from django.http import HttpResponse

        from .reportsheet import render_student_pdf

        roll = (request.query_params.get('roll') or '').strip()
        if not roll.isdigit() or not 4 <= len(roll) <= 10:
            return Response(
                {'error': 'Provide a numeric roll number, e.g. ?roll=612120.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = _search_payload(roll)
        if not payload['found']:
            return Response(
                {'error': f'No result found for roll {roll}.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        pdf = render_student_pdf(payload)
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="BTEB-Result-{roll}.pdf"'
        )
        return response


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


class ClassmateResultsView(APIView):
    """The logged-in student's class friends and their latest board results.

    "Class" = same department + semester + shift. Compact payload for the
    Friends tab: name, roll and the newest published result (GPA for passed;
    bare subject CODES for pending — no catalog detail, by design).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date

        from apps.students.models import exclude_unapproved_alumni

        user = request.user
        if not getattr(user, 'can_access_student_portal', lambda: False)():
            return Response(status=status.HTTP_403_FORBIDDEN)
        me = Student.objects.filter(id=user.related_profile_id).first()
        if me is None:
            return Response(
                {'error': 'No student profile linked to this account.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        classmates = exclude_unapproved_alumni(
            Student.objects.filter(
                department=me.department,
                semester=me.semester,
                shift=me.shift,
                status='active',
            )
            .exclude(id=me.id)
            .exclude(currentRollNumber='')
        ).order_by('currentRollNumber')

        by_roll = {c.currentRollNumber: c for c in classmates}
        results = (
            StudentResult.objects
            .filter(rollNumber__in=list(by_roll))
            .select_related('exam')
            .prefetch_related('semesterGpas', 'subjects')
        )
        # Latest published result per roll (corrections supersede — same
        # ordering rule as the roll search).
        latest: dict[str, StudentResult] = {}
        for row in sorted(
            results,
            key=lambda r: (r.exam.publicationDate or date.min, r.id),
        ):
            latest[row.rollNumber] = row

        friends = []
        for roll, mate in by_roll.items():
            row = latest.get(roll)
            entry = {
                'roll': roll,
                'name': mate.fullNameEnglish,
                'photo': mate.profilePhoto or '',
                'semester': None,
                'resultType': None,
                'gpa': None,
                'cgpa': None,
                'subjectCodes': [],
            }
            if row is not None:
                own = next(
                    (g.gpa for g in row.semesterGpas.all()
                     if g.semester == row.exam.semester),
                    None,
                )
                entry.update({
                    'semester': row.exam.semester,
                    'resultType': row.resultType,
                    'gpa': str(own) if own is not None else None,
                    'cgpa': str(row.cgpa) if row.cgpa is not None else None,
                    'subjectCodes': sorted({
                        s.subjectCode for s in row.subjects.all()
                    }) if row.resultType != 'passed' else [],
                })
            friends.append(entry)

        # Passed first (highest GPA on top), then pending, then no-result.
        def sort_key(f):
            if f['gpa'] is not None:
                return (0, -float(f['gpa']))
            if f['resultType'] is not None:
                return (1, 0)
            return (2, 0)

        friends.sort(key=sort_key)
        return Response({
            'classInfo': {
                'department': me.department.name,
                'semester': me.semester,
                'shift': me.shift,
                'count': len(friends),
            },
            'friends': friends,
        })


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
