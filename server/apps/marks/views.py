from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from apps.authentication.permissions import StudentSelfReadOnly, STUDENT_ROLES, scoped_student_id
from .models import MarksRecord
from .serializers import MarksRecordSerializer, MarksCreateSerializer


# Roles with unrestricted marks access (Principal / Registrar).
MARKS_FULL_ROLES = ('institute_head', 'registrar')


def _resolve_teacher_id(user):
    """The Teacher profile id for a teacher user (or None)."""
    if getattr(user, 'role', None) != 'teacher':
        return None
    if getattr(user, 'related_profile_id', None):
        return user.related_profile_id
    try:
        from apps.teachers.models import Teacher
        teacher = Teacher.objects.filter(email=user.email).only('id').first()
        return teacher.id if teacher else None
    except Exception:
        return None


def _teacher_cohorts(user):
    """Distinct (department_id, semester, shift) tuples the teacher teaches."""
    teacher_id = _resolve_teacher_id(user)
    if not teacher_id:
        return []
    from apps.class_routines.models import ClassRoutine
    return list(
        ClassRoutine.objects.filter(teacher_id=teacher_id)
        .values_list('department_id', 'semester', 'shift')
        .distinct()
    )


def scope_marks_queryset(qs, user):
    """
    Restrict a MarksRecord queryset to what `user` may access:

      student / captain -> only their own records (marks have no captain
                           workflow, so a captain is treated like a student to
                           avoid leaking classmates' grades)
      teacher           -> marks they recorded, or for a cohort
                           (dept+semester+shift) they teach
      department_head   -> only their department's students
      registrar / institute_head / superuser -> everything

    Deny-by-default: any unauthenticated / unresolved case returns none().
    """
    if not (user and getattr(user, 'is_authenticated', False)):
        return qs.none()
    role = getattr(user, 'role', None)
    if user.is_superuser or role in MARKS_FULL_ROLES:
        return qs
    if role == 'department_head':
        dept_id = getattr(user, 'department_id', None)
        return qs.filter(student__department_id=dept_id) if dept_id else qs.none()
    if role == 'teacher':
        q = Q(recorded_by=user)
        for dept_id, sem, shift in _teacher_cohorts(user):
            q |= Q(student__department_id=dept_id, student__semester=sem, student__shift=shift)
        return qs.filter(q)
    if role in STUDENT_ROLES:
        pid = getattr(user, 'related_profile_id', None)
        return qs.filter(student_id=pid) if pid else qs.none()
    return qs.none()


def _allowed_marks_student_ids(user):
    """
    Set of student-id strings the user may WRITE marks for, or None meaning
    "all" (Principal / Registrar / superuser). Empty set means none.
    """
    role = getattr(user, 'role', None)
    if user.is_superuser or role in MARKS_FULL_ROLES:
        return None
    from apps.students.models import Student
    if role == 'teacher':
        cohorts = _teacher_cohorts(user)
        if not cohorts:
            return set()
        q = Q()
        for dept_id, sem, shift in cohorts:
            q |= Q(department_id=dept_id, semester=sem, shift=shift)
        return set(str(s) for s in Student.objects.filter(q).values_list('id', flat=True))
    if role == 'department_head':
        dept_id = getattr(user, 'department_id', None)
        if not dept_id:
            return set()
        return set(
            str(s) for s in Student.objects.filter(department_id=dept_id).values_list('id', flat=True)
        )
    # Students / captains (and any other role) may not write marks.
    return set()


class MarksViewSet(viewsets.ModelViewSet):
    queryset = MarksRecord.objects.all()
    permission_classes = [StudentSelfReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'subject_code', 'semester', 'exam_type']

    def get_queryset(self):
        """Row-scope marks by role (see scope_marks_queryset)."""
        qs = MarksRecord.objects.all()
        return scope_marks_queryset(qs, self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return MarksCreateSerializer
        return MarksRecordSerializer

    def create(self, request, *args, **kwargs):
        """Create one record, enforcing that the writer owns the student's class."""
        sid = request.data.get('student')
        allowed = _allowed_marks_student_ids(request.user)
        if allowed is not None and sid and str(sid) not in allowed:
            return Response(
                {'error': 'You can only manage marks for your own classes.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Stamp the recorder from the session, never from client input."""
        user = self.request.user
        serializer.save(recorded_by=user if getattr(user, 'is_authenticated', False) else None)
    
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

        # Precompute which students this user may write marks for. None == all
        # (Principal/Registrar). Teachers are limited to their class cohorts; a
        # student can never be modified outside them (also blocks editing another
        # cohort's record by id).
        allowed_ids = _allowed_marks_student_ids(request.user)

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
                    target_student_id = str(instance.student_id)
                else:
                    target_student_id = str(item.get('student') or '')

                if allowed_ids is not None and target_student_id not in allowed_ids:
                    raise ValueError('You can only manage marks for your own classes.')

                if record_id:
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
        # A student/captain is pinned to their own profile; teachers/heads/admins
        # may pass any id but only see students within their own scope.
        student_id = scoped_student_id(request, request.query_params.get('student'))
        if not student_id:
            return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)

        marks = scope_marks_queryset(
            MarksRecord.objects.all(), request.user
        ).filter(student_id=student_id)
        semester = request.query_params.get('semester')
        if semester:
            marks = marks.filter(semester=semester)
        
        serializer = MarksRecordSerializer(marks, many=True)
        return Response({'marks': serializer.data})
