import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, SAFE_METHODS
from django_filters.rest_framework import DjangoFilterBackend
from django.db import IntegrityError
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth, TruncWeek
from django.utils import timezone
from django.conf import settings
from .models import AttendanceRecord
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceCreateSerializer,
    BulkAttendanceCreateSerializer,
    AttendanceApprovalSerializer
)

logger = logging.getLogger(__name__)

# Statuses that count toward attendance totals (rejected/draft excluded).
COUNTED_STATUSES = ['approved', 'direct', 'pending']
# Statuses that count for final/verified reporting.
VERIFIED_STATUSES = ['approved', 'direct']


def _resolve_teacher_id(user):
    """Return the teacher profile UUID for an authenticated teacher user."""
    if not getattr(user, 'is_authenticated', False):
        return None
    if getattr(user, 'role', None) != 'teacher':
        return None
    if user.related_profile_id:
        return user.related_profile_id
    try:
        from apps.teachers.models import Teacher
        teacher = Teacher.objects.filter(email=user.email).only('id').first()
        return teacher.id if teacher else None
    except Exception:
        return None


def _teacher_routines(user):
    """Class routines owned by the requesting teacher (or None if not a teacher)."""
    teacher_id = _resolve_teacher_id(user)
    if not teacher_id:
        return None
    from apps.class_routines.models import ClassRoutine
    return ClassRoutine.objects.filter(teacher_id=teacher_id)


# Roles with unrestricted attendance access (Principal / Registrar).
ATTENDANCE_FULL_ROLES = ('institute_head', 'registrar')


def _user_student(user):
    """The Student profile linked to a student/captain user (or None)."""
    pid = getattr(user, 'related_profile_id', None)
    if not pid:
        return None
    from apps.students.models import Student
    return Student.objects.filter(id=pid).select_related('department').first()


def scope_attendance_queryset(qs, user):
    """
    Restrict an AttendanceRecord queryset to what `user` may access:

      student          -> only their own records
      captain          -> only their class/section (dept + semester + shift)
      teacher          -> only records for classes they teach or recorded
      department_head  -> only their department's students
      registrar / institute_head / superuser -> everything

    Any unauthenticated or unresolved case returns an empty queryset
    (deny-by-default), so a new role can never accidentally see everything.
    """
    if not (user and getattr(user, 'is_authenticated', False)):
        return qs.none()
    role = getattr(user, 'role', None)
    if user.is_superuser or role in ATTENDANCE_FULL_ROLES:
        return qs
    if role == 'department_head':
        dept_id = getattr(user, 'department_id', None)
        return qs.filter(student__department_id=dept_id) if dept_id else qs.none()
    if role == 'teacher':
        teacher_id = _resolve_teacher_id(user)
        if not teacher_id:
            return qs.none()
        return qs.filter(
            Q(class_routine__teacher_id=teacher_id) | Q(recorded_by=user)
        )
    if role == 'captain':
        student = _user_student(user)
        if not (student and student.department_id and student.semester):
            return qs.none()
        return qs.filter(
            student__department_id=student.department_id,
            student__semester=student.semester,
            student__shift=student.shift,
        )
    if role == 'student':
        pid = getattr(user, 'related_profile_id', None)
        return qs.filter(student_id=pid) if pid else qs.none()
    return qs.none()


def _can_view_student_attendance(user, student):
    """Whether `user` may view a specific student's attendance profile."""
    role = getattr(user, 'role', None)
    if user.is_superuser or role in ATTENDANCE_FULL_ROLES:
        return True
    if role == 'department_head':
        return student.department_id == getattr(user, 'department_id', None)
    if role == 'teacher':
        teacher_id = _resolve_teacher_id(user)
        if not teacher_id:
            return False
        from apps.class_routines.models import ClassRoutine
        return ClassRoutine.objects.filter(
            teacher_id=teacher_id,
            department_id=student.department_id,
            semester=student.semester,
            shift=student.shift,
        ).exists()
    if role == 'captain':
        cap = _user_student(user)
        return bool(
            cap and cap.department_id == student.department_id
            and cap.semester == student.semester
            and cap.shift == student.shift
        )
    if role == 'student':
        return str(getattr(user, 'related_profile_id', '')) == str(student.id)
    return False


def _students_outside_scope(user, student_ids):
    """
    Return the subset of `student_ids` the user may NOT record attendance for.

    Captains are limited to their own section; students may not record at all.
    Teachers/admins are validated by routine linkage elsewhere, so they are not
    constrained here.
    """
    role = getattr(user, 'role', None)
    if user.is_superuser or role in ATTENDANCE_FULL_ROLES or role == 'teacher':
        return []
    from apps.students.models import Student
    if role == 'captain':
        cap = _user_student(user)
        if not cap:
            return [str(s) for s in student_ids]
        allowed = set(
            str(s) for s in Student.objects.filter(
                department_id=cap.department_id,
                semester=cap.semester,
                shift=cap.shift,
            ).values_list('id', flat=True)
        )
        return [str(sid) for sid in student_ids if str(sid) not in allowed]
    # Students (and any other role) cannot record attendance.
    return [str(s) for s in student_ids]


class AttendanceAccessPermission(BasePermission):
    """
    Students get read-only access to attendance; captains, teachers, department
    heads and admins may also write. Which *rows* each of them can see or change
    is enforced by `scope_attendance_queryset` (get_queryset) and per-action
    cohort checks, not here.
    """

    message = 'You do not have permission to modify attendance records.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if getattr(user, 'role', None) == 'student':
            return request.method in SAFE_METHODS
        return True


def _log_attendance_activity(request, action_type, description, entity_id='', changes=None):
    """Best-effort audit logging — never blocks the main operation."""
    try:
        from apps.activity_logs.signals import log_activity
        user = request.user if getattr(request.user, 'is_authenticated', False) else None
        log_activity(
            user=user,
            action_type=action_type,
            entity_type='attendance',
            entity_id=str(entity_id),
            description=description,
            changes=changes or {},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        )
    except Exception as exc:
        logger.warning("Attendance activity log failed: %s", exc)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    permission_classes = [AttendanceAccessPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'student', 'subject_code', 'semester', 'date',
        'is_present', 'status', 'class_routine', 'recorded_by'
    ]

    def get_serializer_class(self):
        if self.action == 'create':
            return AttendanceCreateSerializer
        elif self.action == 'bulk_create':
            return BulkAttendanceCreateSerializer
        elif self.action == 'approve_attendance':
            return AttendanceApprovalSerializer
        return AttendanceRecordSerializer

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related(
            'student', 'class_routine', 'recorded_by', 'approved_by'
        ).all()
        return scope_attendance_queryset(qs, self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a single record, enforcing captain section scope."""
        student_id = request.data.get('student')
        if student_id and _students_outside_scope(request.user, [student_id]):
            return Response(
                {'error': 'You can only record attendance for your own class/section.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Override update to send notifications and keep an audit trail."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_is_present = instance.is_present
        old_type = instance.attendance_type

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Send notification if attendance status changed
        new_is_present = serializer.instance.is_present
        if old_is_present != new_is_present:
            try:
                from apps.notifications.utils import create_attendance_notification
                from apps.authentication.models import User

                # Find student's user account
                student_user = User.objects.filter(
                    related_profile_id=serializer.instance.student.id,
                    role__in=['student', 'captain']
                ).first()

                if student_user:
                    create_attendance_notification(student_user, serializer.instance, action='updated')
            except Exception as e:
                logger.warning("Failed to send attendance notification: %s", e)

        # Auto-sync student profile attendance (no-op unless dept toggle is on).
        try:
            from .sync import sync_students_for_records
            sync_students_for_records([serializer.instance])
        except Exception as e:
            logger.warning("Attendance auto-sync failed after update: %s", e)

        if old_is_present != new_is_present or old_type != serializer.instance.attendance_type:
            _log_attendance_activity(
                request, 'update',
                f"Attendance corrected for {serializer.instance.student.fullNameEnglish} "
                f"({serializer.instance.subject_code}, {serializer.instance.date})",
                entity_id=serializer.instance.id,
                changes={
                    'is_present': {'from': old_is_present, 'to': new_is_present},
                    'attendance_type': {'from': old_type, 'to': serializer.instance.attendance_type},
                },
            )

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to send notifications"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Only the owning teacher (or staff) may delete attendance records."""
        instance = self.get_object()

        user = request.user
        is_staff = getattr(user, 'is_staff', False) or getattr(user, 'role', None) == 'admin'
        if not is_staff:
            routines = _teacher_routines(user)
            owns_record = (
                routines is not None and
                instance.class_routine_id is not None and
                routines.filter(id=instance.class_routine_id).exists()
            )
            if not owns_record:
                return Response(
                    {'error': 'You do not have permission to delete this attendance record.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        _log_attendance_activity(
            request, 'delete',
            f"Attendance record deleted for {instance.student.fullNameEnglish} "
            f"({instance.subject_code}, {instance.date})",
            entity_id=instance.id,
            changes={'is_present': instance.is_present, 'status': instance.status},
        )
        student, semester = instance.student, instance.semester
        response = super().destroy(request, *args, **kwargs)

        # Re-sync the student's profile attendance after the deletion.
        try:
            from .sync import sync_student_attendance
            sync_student_attendance(student, semester=semester)
        except Exception as e:
            logger.warning("Attendance auto-sync failed after delete: %s", e)

        return response

    @action(detail=False, methods=['get'])
    def student_summary(self, request):
        """Get attendance summary for a student"""
        student_id = request.query_params.get('student')
        if not student_id:
            return Response(
                {'error': 'Student ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Count all non-rejected attendance so captain submissions (pending)
        # are reflected immediately in student-side totals. Scoped to what the
        # caller may access, so a student can never read another student's
        # summary by passing a different id.
        records = scope_attendance_queryset(
            AttendanceRecord.objects.all(), request.user
        ).filter(student_id=student_id).exclude(
            status__in=['rejected', 'draft']
        )

        summary = records.values('subject_code', 'subject_name').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(is_present=True))
        )

        for item in summary:
            item['percentage'] = (
                (item['present'] / item['total'] * 100)
                if item['total'] > 0 else 0
            )

        return Response({'summary': list(summary)})

    @action(detail=False, methods=['get'])
    def student_profile(self, request):
        """
        Full attendance profile for one student (teacher view).

        GET /api/attendance/student_profile/?student=<uuid>
        Optional: subject_code, date_from, date_to
        Returns overall totals (present/absent/late/leave), percentage,
        monthly statistics and subject-wise breakdown.
        """
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.students.models import Student
            student = Student.objects.select_related('department').get(id=student_id)
        except Exception:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        # Authorize before revealing any of the student's info/attendance.
        if not _can_view_student_attendance(request.user, student):
            return Response(
                {'error': 'You do not have permission to view this student.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        records = scope_attendance_queryset(
            AttendanceRecord.objects.all(), request.user
        ).filter(
            student_id=student_id,
            status__in=COUNTED_STATUSES,
        )

        subject_code = request.query_params.get('subject_code')
        if subject_code:
            records = records.filter(subject_code=subject_code)
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            records = records.filter(date__gte=date_from)
        if date_to:
            records = records.filter(date__lte=date_to)

        type_counts = records.aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(is_present=True)),
            absent=Count('id', filter=Q(is_present=False)),
            late=Count('id', filter=Q(attendance_type='late')),
            leave=Count('id', filter=Q(attendance_type='leave')),
        )
        total = type_counts['total'] or 0
        percentage = round(type_counts['present'] / total * 100, 2) if total else 0

        # Monthly statistics (last 12 months present in data)
        monthly = (
            records.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(is_present=True)),
                late=Count('id', filter=Q(attendance_type='late')),
                leave=Count('id', filter=Q(attendance_type='leave')),
            )
            .order_by('month')
        )
        monthly_stats = [
            {
                'month': item['month'].strftime('%Y-%m'),
                'label': item['month'].strftime('%b %Y'),
                'total': item['total'],
                'present': item['present'],
                'absent': item['total'] - item['present'],
                'late': item['late'],
                'leave': item['leave'],
                'percentage': round(item['present'] / item['total'] * 100, 1) if item['total'] else 0,
            }
            for item in monthly
        ][-12:]

        # Subject-wise breakdown
        subjects = (
            records.values('subject_code', 'subject_name')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(is_present=True)),
                late=Count('id', filter=Q(attendance_type='late')),
                leave=Count('id', filter=Q(attendance_type='leave')),
            )
            .order_by('subject_code')
        )
        subject_stats = [
            {
                **item,
                'absent': item['total'] - item['present'],
                'percentage': round(item['present'] / item['total'] * 100, 1) if item['total'] else 0,
            }
            for item in subjects
        ]

        return Response({
            'student': {
                'id': str(student.id),
                'name': student.fullNameEnglish,
                'roll': student.currentRollNumber,
                'registration': student.currentRegistrationNumber,
                'department': student.department.name if student.department else None,
                'semester': student.semester,
                'shift': student.shift,
                'session': student.session,
                'status': student.status,
                'profilePhoto': student.profilePhoto or None,
            },
            'summary': {
                'totalClasses': total,
                'present': type_counts['present'],
                'absent': type_counts['absent'],
                'late': type_counts['late'],
                'leave': type_counts['leave'],
                'percentage': percentage,
            },
            'monthly': monthly_stats,
            'subjects': subject_stats,
        })

    @action(detail=False, methods=['get'])
    def teacher_records(self, request):
        """
        Paginated, server-side-filtered attendance records for the requesting teacher.

        GET /api/attendance/teacher_records/
        Filters: department, semester, shift, session, subject_code, class_routine,
                 date, date_from, date_to, status, is_present, attendance_type, search
        """
        routines = _teacher_routines(request.user)
        if routines is None:
            return Response({'error': 'Teacher profile not found'}, status=status.HTTP_403_FORBIDDEN)

        records = self.get_queryset().filter(class_routine__in=routines)

        params = request.query_params
        if params.get('department'):
            records = records.filter(class_routine__department_id=params['department'])
        if params.get('semester'):
            records = records.filter(semester=params['semester'])
        if params.get('shift'):
            records = records.filter(class_routine__shift=params['shift'])
        if params.get('session'):
            records = records.filter(class_routine__session=params['session'])
        if params.get('subject_code'):
            records = records.filter(subject_code=params['subject_code'])
        if params.get('class_routine'):
            records = records.filter(class_routine_id=params['class_routine'])
        if params.get('date'):
            records = records.filter(date=params['date'])
        if params.get('date_from'):
            records = records.filter(date__gte=params['date_from'])
        if params.get('date_to'):
            records = records.filter(date__lte=params['date_to'])
        if params.get('status'):
            statuses = [s.strip() for s in params['status'].split(',') if s.strip()]
            records = records.filter(status__in=statuses)
        else:
            records = records.exclude(status__in=['rejected', 'draft'])
        if params.get('is_present') in ('true', 'false'):
            records = records.filter(is_present=params['is_present'] == 'true')
        if params.get('attendance_type'):
            records = records.filter(attendance_type=params['attendance_type'])
        if params.get('search'):
            term = params['search'].strip()
            records = records.filter(
                Q(student__fullNameEnglish__icontains=term) |
                Q(student__currentRollNumber__icontains=term) |
                Q(subject_name__icontains=term) |
                Q(subject_code__icontains=term)
            )

        ordering = params.get('ordering') or '-date'
        allowed_ordering = {
            'date', '-date', 'recorded_at', '-recorded_at',
            'student__currentRollNumber', '-student__currentRollNumber',
            'subject_code', '-subject_code',
        }
        if ordering in allowed_ordering:
            records = records.order_by(ordering, 'student__currentRollNumber')

        page = self.paginate_queryset(records)
        serializer = AttendanceRecordSerializer(page if page is not None else records, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def attendance_register(self, request):
        """
        Attendance register (matrix) for one subject/class of the requesting
        teacher: rows = students, columns = class dates.

        GET /api/attendance/attendance_register/
        Required: department, semester, shift, subject_code
        Optional: session, date_from, date_to
        """
        routines = _teacher_routines(request.user)
        if routines is None:
            return Response({'error': 'Teacher profile not found'}, status=status.HTTP_403_FORBIDDEN)

        params = request.query_params
        required = ['department', 'semester', 'shift', 'subject_code']
        missing = [f for f in required if not params.get(f)]
        if missing:
            return Response(
                {'error': f"Missing required filters: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        class_routines = routines.filter(
            department_id=params['department'],
            semester=params['semester'],
            shift=params['shift'],
            subject_code=params['subject_code'],
        )
        if params.get('session'):
            class_routines = class_routines.filter(session=params['session'])
        if not class_routines.exists():
            return Response(
                {'error': 'No class found for the selected filters.'},
                status=status.HTTP_404_NOT_FOUND
            )

        sample = class_routines.select_related('department').first()

        records = AttendanceRecord.objects.filter(
            class_routine__in=class_routines,
            status__in=VERIFIED_STATUSES,
        ).select_related('student')
        if params.get('date_from'):
            records = records.filter(date__gte=params['date_from'])
        if params.get('date_to'):
            records = records.filter(date__lte=params['date_to'])

        # Build the matrix: one column per class date, one row per student.
        dates = sorted({r.date for r in records})
        students = {}
        for record in records:
            sid = str(record.student_id)
            if sid not in students:
                students[sid] = {
                    'student_id': sid,
                    'name': record.student.fullNameEnglish,
                    'roll': record.student.currentRollNumber,
                    'cells': {},
                    'present': 0,
                    'absent': 0,
                    'late': 0,
                    'leave': 0,
                }
            row = students[sid]
            date_key = record.date.isoformat()
            cell_type = record.attendance_type or ('present' if record.is_present else 'absent')
            # One cell per date — a later/present record wins over an earlier one.
            previous = row['cells'].get(date_key)
            if previous is None or (record.is_present and previous in ('absent', 'leave')):
                row['cells'][date_key] = cell_type

        # Totals from the final cell values (so duplicates never double-count).
        date_keys = [d.isoformat() for d in dates]
        totals_by_date = {key: {'present': 0, 'absent': 0} for key in date_keys}
        rows = []
        for row in students.values():
            present = sum(1 for v in row['cells'].values() if v in ('present', 'late'))
            total = len(row['cells'])
            row['present'] = present
            row['absent'] = total - present
            row['late'] = sum(1 for v in row['cells'].values() if v == 'late')
            row['leave'] = sum(1 for v in row['cells'].values() if v == 'leave')
            row['total'] = total
            row['percentage'] = round(present / total * 100, 1) if total else 0
            for key, value in row['cells'].items():
                if value in ('present', 'late'):
                    totals_by_date[key]['present'] += 1
                else:
                    totals_by_date[key]['absent'] += 1
            rows.append(row)
        rows.sort(key=lambda r: r['roll'] or '')

        return Response({
            'subject': {
                'subject_code': sample.subject_code,
                'subject_name': sample.subject_name,
                'department': sample.department.name,
                'semester': sample.semester,
                'shift': sample.shift,
                'session': sample.session,
            },
            'dates': date_keys,
            'students': rows,
            'totalsByDate': totals_by_date,
        })

    @action(detail=False, methods=['get'])
    def teacher_analytics(self, request):
        """
        Aggregated attendance analytics for the requesting teacher's classes.

        GET /api/attendance/teacher_analytics/
        Optional filters: department, semester, shift, subject_code, date_from, date_to
        """
        routines = _teacher_routines(request.user)
        if routines is None:
            return Response({'error': 'Teacher profile not found'}, status=status.HTTP_403_FORBIDDEN)

        records = AttendanceRecord.objects.filter(
            class_routine__in=routines,
            status__in=VERIFIED_STATUSES,
        )

        params = request.query_params
        if params.get('department'):
            records = records.filter(class_routine__department_id=params['department'])
        if params.get('semester'):
            records = records.filter(semester=params['semester'])
        if params.get('shift'):
            records = records.filter(class_routine__shift=params['shift'])
        if params.get('subject_code'):
            records = records.filter(subject_code=params['subject_code'])
        if params.get('date_from'):
            records = records.filter(date__gte=params['date_from'])
        if params.get('date_to'):
            records = records.filter(date__lte=params['date_to'])

        overall = records.aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(is_present=True)),
            late=Count('id', filter=Q(attendance_type='late')),
            leave=Count('id', filter=Q(attendance_type='leave')),
        )
        total = overall['total'] or 0

        def _series(qs, trunc, key_fmt, label_fmt):
            data = (
                qs.annotate(bucket=trunc('date'))
                .values('bucket')
                .annotate(
                    total=Count('id'),
                    present=Count('id', filter=Q(is_present=True)),
                )
                .order_by('bucket')
            )
            return [
                {
                    'key': item['bucket'].strftime(key_fmt),
                    'label': item['bucket'].strftime(label_fmt),
                    'total': item['total'],
                    'present': item['present'],
                    'absent': item['total'] - item['present'],
                    'percentage': round(item['present'] / item['total'] * 100, 1) if item['total'] else 0,
                }
                for item in data
            ]

        monthly_trend = _series(records, TruncMonth, '%Y-%m', '%b %Y')[-12:]
        weekly_trend = _series(records, TruncWeek, '%Y-%m-%d', 'Wk of %b %d')[-10:]

        def _group(qs, *fields):
            data = (
                qs.values(*fields)
                .annotate(
                    total=Count('id'),
                    present=Count('id', filter=Q(is_present=True)),
                    students=Count('student', distinct=True),
                    class_days=Count('date', distinct=True),
                )
                .order_by(fields[0])
            )
            return [
                {
                    **item,
                    'absent': item['total'] - item['present'],
                    'percentage': round(item['present'] / item['total'] * 100, 1) if item['total'] else 0,
                }
                for item in data
            ]

        by_subject = _group(records, 'subject_code', 'subject_name', 'class_routine__department__name', 'semester', 'class_routine__shift')
        by_semester = _group(records, 'semester')
        by_department = _group(records, 'class_routine__department__name')

        return Response({
            'overall': {
                'totalRecords': total,
                'present': overall['present'],
                'absent': total - overall['present'],
                'late': overall['late'],
                'leave': overall['leave'],
                'percentage': round(overall['present'] / total * 100, 1) if total else 0,
            },
            'monthlyTrend': monthly_trend,
            'weeklyTrend': weekly_trend,
            'bySubject': by_subject,
            'bySemester': by_semester,
            'byDepartment': by_department,
        })

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create/update attendance records (for captain or teacher)."""
        records_data = request.data.get('records', [])
        routine_id = request.data.get('class_routine_id')
        routine = None

        if not records_data:
            return Response(
                {'error': 'No records provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # A captain may only submit attendance for their own class/section.
        # (Teachers/admins are validated by routine linkage below.)
        student_ids = [r.get('student') for r in records_data if r.get('student')]
        outside = _students_outside_scope(request.user, student_ids)
        if outside:
            return Response(
                {'error': 'You can only record attendance for your own class/section.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        request_user_id = getattr(request.user, 'id', None)

        # Validate routine once. Do not silently create records without routine linkage.
        if routine_id:
            from apps.class_routines.models import ClassRoutine
            try:
                routine = ClassRoutine.objects.get(id=routine_id)
            except ClassRoutine.DoesNotExist:
                return Response(
                    {'error': f'Class routine not found: {routine_id}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Attendance cannot be recorded for future dates. One day of grace is
        # allowed because the server runs on UTC while clients may be ahead
        # (e.g. Asia/Dhaka is UTC+6, so their "today" arrives 6 hours early).
        first_date = records_data[0].get('date')
        try:
            from datetime import date as date_cls, timedelta
            if first_date and date_cls.fromisoformat(str(first_date)) > timezone.localdate() + timedelta(days=1):
                return Response(
                    {'error': 'Attendance cannot be recorded for a future date.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': f'Invalid date: {first_date}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_records = []
        errors = []

        from apps.authentication.models import User

        for idx, record_data in enumerate(records_data):
            try:
                raw_type = record_data.get('attendance_type') or record_data.get('attendanceType') or ''
                is_present_raw = record_data.get('is_present') if 'is_present' in record_data else record_data.get('isPresent')
                if raw_type and raw_type not in ('present', 'absent', 'late', 'leave'):
                    raise ValueError(f'Invalid attendance_type: {raw_type}')

                # Convert camelCase to snake_case if needed
                processed_data = {
                    'student_id': record_data.get('student'),
                    'subject_code': record_data.get('subject_code') or record_data.get('subjectCode'),
                    'subject_name': record_data.get('subject_name') or record_data.get('subjectName'),
                    'semester': record_data.get('semester'),
                    'date': record_data.get('date'),
                    'is_present': raw_type in ('present', 'late') if raw_type else bool(is_present_raw),
                    'attendance_type': raw_type or ('present' if is_present_raw else 'absent'),
                    'status': record_data.get('status', 'direct'),
                    'notes': record_data.get('notes', ''),
                    'recorded_by': record_data.get('recorded_by') or record_data.get('recordedBy') or request_user_id,
                }

                if processed_data['status'] not in ('draft', 'pending', 'direct'):
                    raise ValueError(f"Invalid status for new attendance: {processed_data['status']}")

                # Add routine if provided
                if routine:
                    processed_data['class_routine_id'] = routine.id

                # Resolve recorded_by user object
                if processed_data['recorded_by']:
                    try:
                        processed_data['recorded_by'] = User.objects.get(id=processed_data['recorded_by'])
                    except User.DoesNotExist:
                        processed_data['recorded_by'] = request.user if getattr(request.user, 'is_authenticated', False) else None
                else:
                    processed_data['recorded_by'] = request.user if getattr(request.user, 'is_authenticated', False) else None

                # Check if record already exists.
                # Prefer routine-scoped identity to avoid cross-class overwrites.
                if processed_data.get('class_routine_id'):
                    existing = AttendanceRecord.objects.filter(
                        student_id=processed_data['student_id'],
                        class_routine_id=processed_data['class_routine_id'],
                        date=processed_data['date']
                    ).first()
                    # Backward-compat fallback for databases still on old uniqueness.
                    # Only relink legacy rows that have no routine set.
                    if not existing:
                        existing = AttendanceRecord.objects.filter(
                            student_id=processed_data['student_id'],
                            subject_code=processed_data['subject_code'],
                            date=processed_data['date'],
                            class_routine__isnull=True
                        ).first()
                else:
                    existing = AttendanceRecord.objects.filter(
                        student_id=processed_data['student_id'],
                        subject_code=processed_data['subject_code'],
                        date=processed_data['date']
                    ).first()

                if existing:
                    # Update existing record
                    existing.subject_name = processed_data['subject_name']
                    existing.semester = processed_data['semester']
                    existing.is_present = processed_data['is_present']
                    existing.attendance_type = processed_data['attendance_type']
                    existing.status = processed_data['status']
                    existing.notes = processed_data['notes']
                    existing.recorded_by = processed_data['recorded_by']
                    if 'class_routine_id' in processed_data:
                        existing.class_routine_id = processed_data['class_routine_id']
                    existing.save()
                    created_records.append(existing)
                else:
                    # Create new record (fallback to update if legacy unique constraint conflicts)
                    try:
                        record = AttendanceRecord.objects.create(**processed_data)
                    except IntegrityError:
                        fallback_existing = AttendanceRecord.objects.filter(
                            student_id=processed_data['student_id'],
                            subject_code=processed_data['subject_code'],
                            date=processed_data['date'],
                            class_routine__isnull=True
                        ).first()
                        if not fallback_existing:
                            raise

                        fallback_existing.subject_name = processed_data['subject_name']
                        fallback_existing.semester = processed_data['semester']
                        fallback_existing.is_present = processed_data['is_present']
                        fallback_existing.attendance_type = processed_data['attendance_type']
                        fallback_existing.status = processed_data['status']
                        fallback_existing.notes = processed_data['notes']
                        fallback_existing.recorded_by = processed_data['recorded_by']
                        if 'class_routine_id' in processed_data:
                            fallback_existing.class_routine_id = processed_data['class_routine_id']
                        fallback_existing.save()
                        created_records.append(fallback_existing)
                        continue
                    created_records.append(record)

            except Exception as e:
                logger.exception("Bulk attendance: error processing record %s", idx + 1)
                errors.append({
                    'student': str(record_data.get('student', '')),
                    'error': str(e) if settings.DEBUG else 'Failed to save record'
                })

        # Send notifications to students
        try:
            from apps.notifications.utils import send_bulk_attendance_notifications
            send_bulk_attendance_notifications(created_records, action='marked')
        except Exception as e:
            logger.warning("Failed to send bulk attendance notifications: %s", e)

        # Ensure all records are refreshed from database
        for record in created_records:
            record.refresh_from_db()

        # Auto-sync student profile attendance (no-op unless dept toggle is on).
        try:
            from .sync import sync_students_for_records
            sync_students_for_records(created_records)
        except Exception as e:
            logger.warning("Attendance auto-sync failed after bulk create: %s", e)

        if created_records:
            _log_attendance_activity(
                request, 'create',
                f"Bulk attendance saved: {len(created_records)} records "
                f"({created_records[0].subject_code}, {created_records[0].date})",
                entity_id=routine_id or '',
                changes={'count': len(created_records), 'errors': len(errors)},
            )

        response_serializer = AttendanceRecordSerializer(created_records, many=True)

        if errors and not created_records:
            return Response({
                'created': len(created_records),
                'errors': errors,
                'records': response_serializer.data
            }, status=status.HTTP_400_BAD_REQUEST)

        if errors:
            return Response({
                'created': len(created_records),
                'errors': errors,
                'records': response_serializer.data
            }, status=status.HTTP_207_MULTI_STATUS)

        return Response({
            'created': len(created_records),
            'errors': errors,
            'records': response_serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def approve_attendance(self, request):
        """Approve or reject attendance records (for teachers)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        attendance_ids = serializer.validated_data['attendance_ids']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')

        records = AttendanceRecord.objects.filter(
            id__in=attendance_ids,
            status='pending'
        )

        # Teachers may only act on submissions for their own classes.
        routines = _teacher_routines(request.user)
        if routines is not None:
            records = records.filter(class_routine__in=routines)
        elif not (getattr(request.user, 'is_staff', False) or getattr(request.user, 'role', None) == 'admin'):
            return Response(
                {'error': 'Only teachers can approve or reject attendance.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not records.exists():
            return Response(
                {'error': 'No pending records found'},
                status=status.HTTP_404_NOT_FOUND
            )

        updated_records = []
        updated_count = 0
        for record in records:
            if action_type == 'approve':
                record.status = 'approved'
                record.approved_by = request.user
                record.approved_at = timezone.now()
            else:  # reject
                record.status = 'rejected'
                record.rejection_reason = rejection_reason
                record.approved_by = request.user
                record.approved_at = timezone.now()

            record.save()
            updated_records.append(record)
            updated_count += 1

        # Send notifications to students
        try:
            from apps.notifications.utils import send_bulk_attendance_notifications
            send_bulk_attendance_notifications(updated_records, action=action_type + 'd')
        except Exception as e:
            logger.warning("Failed to send approval notifications: %s", e)

        # Approved records become countable — sync student profile attendance.
        try:
            from .sync import sync_students_for_records
            sync_students_for_records(updated_records)
        except Exception as e:
            logger.warning("Attendance auto-sync failed after approval: %s", e)

        _log_attendance_activity(
            request, 'approve' if action_type == 'approve' else 'reject',
            f"{updated_count} attendance records {action_type}d",
            changes={'count': updated_count, 'reason': rejection_reason},
        )

        return Response({
            'message': f'{updated_count} records {action_type}d successfully',
            'updated': updated_count
        })

    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get pending attendance records for teacher approval"""
        # Filter by teacher's subjects if needed
        subject_code = request.query_params.get('subject_code')
        date = request.query_params.get('date')

        queryset = self.get_queryset().filter(status='pending')

        # Filter by logged-in teacher's classes
        # If user is a teacher, only show pending approvals for their classes
        routines = _teacher_routines(request.user)
        if routines is not None:
            queryset = queryset.filter(class_routine__in=routines)

        if subject_code:
            queryset = queryset.filter(subject_code=subject_code)
        if date:
            queryset = queryset.filter(date=date)

        # Group by date and subject
        records = queryset.order_by('-date', 'subject_code')
        serializer = AttendanceRecordSerializer(records, many=True)

        return Response({
            'count': records.count(),
            'records': serializer.data
        })

    @action(detail=False, methods=['get'])
    def by_routine(self, request):
        """Get attendance records for a specific routine"""
        routine_id = request.query_params.get('routine_id')
        date = request.query_params.get('date')
        status_in = request.query_params.get('status_in')

        if not routine_id:
            return Response(
                {'error': 'Routine ID required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(class_routine_id=routine_id)

        if date:
            queryset = queryset.filter(date=date)
        if status_in:
            statuses = [s.strip() for s in status_in.split(',') if s.strip()]
            if statuses:
                queryset = queryset.filter(status__in=statuses)

        serializer = AttendanceRecordSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def teacher_subject_summary(self, request):
        """Get attendance summary by subject for a teacher"""
        routines = _teacher_routines(request.user)
        if routines is None:
            return Response(
                {'error': 'Teacher profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        teacher_routines = routines.filter(is_active=True).select_related('department')

        # Group by class identity (subject + department + semester + shift + session)
        # so same subject in different classes doesn't merge, and multiple periods
        # for the same class are aggregated correctly.
        subjects = {}
        routine_to_subject_key = {}
        for routine in teacher_routines:
            key = f"{routine.subject_code}::{routine.department_id}::{routine.semester}::{routine.shift}::{routine.session}"
            routine_id = str(routine.id)
            routine_to_subject_key[routine_id] = key
            if key not in subjects:
                subjects[key] = {
                    'subject_code': routine.subject_code,
                    'subject_name': routine.subject_name,
                    'department': routine.department.name,
                    'department_id': str(routine.department_id),
                    'semester': routine.semester,
                    'shift': routine.shift,
                    'session': routine.session,
                    'routine_id': routine_id,
                    'routine_ids': set(),
                    'total_classes': 0,
                    'students': {},
                    'class_sessions': set(),
                }
            subjects[key]['routine_ids'].add(routine_id)

        # Get all attendance records for these routines
        attendance_records = AttendanceRecord.objects.filter(
            class_routine__in=teacher_routines,
            status__in=VERIFIED_STATUSES
        ).select_related('student', 'class_routine')

        # Aggregate classes and student attendance per class group.
        # Use one attendance contribution per student per date to avoid
        # inflation from legacy duplicate records.
        seen_student_sessions = set()
        for record in attendance_records:
            if not record.class_routine_id:
                continue

            routine_key = str(record.class_routine_id)
            subject_key = routine_to_subject_key.get(routine_key)
            if not subject_key or subject_key not in subjects:
                continue

            student_id = str(record.student.id)
            # Count one class per routine per date so different periods for the
            # same subject/day are counted separately.
            session_key = f"{routine_key}::{record.date.isoformat()}"
            subjects[subject_key]['class_sessions'].add(session_key)
            # Deduplicate only exact duplicate rows of the same routine/date.
            student_session_key = f"{subject_key}::{student_id}::{session_key}"
            if student_session_key in seen_student_sessions:
                continue
            seen_student_sessions.add(student_session_key)

            if student_id not in subjects[subject_key]['students']:
                subjects[subject_key]['students'][student_id] = {
                    'student_id': student_id,
                    'student_name': record.student.fullNameEnglish,
                    'student_roll': record.student.currentRollNumber,
                    'present': 0,
                    'absent': 0,
                    'late': 0,
                    'leave': 0,
                    'total': 0,
                    'percentage': 0
                }

            subjects[subject_key]['students'][student_id]['total'] += 1
            if record.is_present:
                subjects[subject_key]['students'][student_id]['present'] += 1
            else:
                subjects[subject_key]['students'][student_id]['absent'] += 1
            if record.attendance_type == 'late':
                subjects[subject_key]['students'][student_id]['late'] += 1
            elif record.attendance_type == 'leave':
                subjects[subject_key]['students'][student_id]['leave'] += 1

        # Calculate percentages
        for subject in subjects.values():
            for student in subject['students'].values():
                if student['total'] > 0:
                    student['percentage'] = round((student['present'] / student['total']) * 100, 1)

            subject['total_classes'] = len(subject['class_sessions'])
            subject['routine_ids'] = sorted(list(subject['routine_ids']))
            subject.pop('class_sessions', None)
            # Convert students dict to list
            subject['students'] = list(subject['students'].values())
            # Sort by roll number
            subject['students'].sort(key=lambda x: x['student_roll'])

        return Response({
            'subjects': list(subjects.values())
        })
