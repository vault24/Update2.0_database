"""
Class Routine Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from apps.authentication.permissions import BlockStudentWrite
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db.models import Q
from django.db import transaction
from django.conf import settings

from .models import ClassRoutine
from .serializers import (
    ClassRoutineSerializer,
    ClassRoutineCreateSerializer,
    ClassRoutineUpdateSerializer,
    BulkRoutineRequestSerializer
)


def _routine_recipients(routine):
    """Students/captains of the routine's department+semester, plus its teacher."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    recipients = []
    try:
        from apps.students.models import Student
        student_ids = list(Student.objects.filter(
            department=routine.department, semester=routine.semester
        ).values_list('id', flat=True))
        if student_ids:
            recipients = list(User.objects.filter(
                role__in=['student', 'captain'], is_active=True,
                related_profile_id__in=student_ids,
            ))
    except Exception:
        pass
    teacher_user = getattr(getattr(routine, 'teacher', None), 'user', None)
    if teacher_user and teacher_user not in recipients:
        recipients.append(teacher_user)
    return recipients


def _sync_routine_cohorts(routines):
    """
    After routine changes, refresh student-profile attendance subjects for the
    affected cohorts (only acts on departments with autoAttendanceSync on).
    Best-effort — routine saving never fails because of sync.
    """
    try:
        from apps.attendance.sync import sync_cohort
        seen = set()
        for routine in routines:
            key = (routine.department_id, routine.semester, routine.shift)
            if key in seen:
                continue
            seen.add(key)
            sync_cohort(routine.department, routine.semester, routine.shift)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Routine cohort attendance sync failed: %s", exc)


# Total size cap for teacher class-email attachments (matches typical
# SMTP/relay limits with headroom for the branded HTML + inline logo).
MAX_CLASS_EMAIL_ATTACHMENT_BYTES = 10 * 1024 * 1024


def _resolve_teacher_id(user):
    """Return the Teacher profile UUID linked to a teacher user (or None)."""
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


def _may_email_routine_class(user, routine):
    """Only the routine's own teacher (or an admin/superuser) may contact the class."""
    if not (user and user.is_authenticated):
        return False
    from apps.authentication.models import User
    if user.is_superuser or getattr(user, 'role', None) in User.ADMIN_ROLES:
        return True
    teacher_id = _resolve_teacher_id(user)
    return bool(teacher_id and routine.teacher_id and str(teacher_id) == str(routine.teacher_id))


def _routine_class_students(routine):
    """Active students enrolled in the routine's class cohort (dept+semester+shift)."""
    from apps.students.models import Student
    return Student.objects.filter(
        department=routine.department,
        semester=routine.semester,
        shift=routine.shift,
        status='active',
    ).order_by('currentRollNumber')


def _notify_routine(routine, is_update):
    """Send class-routine notification (email + in-app) to relevant users."""
    try:
        from apps.notifications.dispatch import notify_class_routine
        recipients = _routine_recipients(routine)
        if not recipients:
            return
        dept_name = getattr(routine.department, 'name', None)
        scope = f"{dept_name} - Semester {routine.semester} ({routine.shift})" if dept_name else None
        notify_class_routine(
            recipients,
            is_update=is_update,
            department_name=scope,
            details=[
                {'label': 'Department', 'value': dept_name or ''},
                {'label': 'Semester', 'value': str(routine.semester)},
                {'label': 'Shift', 'value': routine.shift},
            ],
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Class routine notification failed: %s", exc)


class ClassRoutineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Class Routine CRUD operations
    
    Provides:
    - list: GET /api/class-routines/
    - create: POST /api/class-routines/
    - retrieve: GET /api/class-routines/{id}/
    - update: PUT /api/class-routines/{id}/
    - partial_update: PATCH /api/class-routines/{id}/
    - destroy: DELETE /api/class-routines/{id}/
    
    Custom actions:
    - my_routine: GET /api/class-routines/my-routine/
    - bulk_update: POST /api/class-routines/bulk-update/
    """
    queryset = ClassRoutine.objects.all()
    # Students/captains may VIEW routines but never create/edit/delete them.
    permission_classes = [BlockStudentWrite]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['department', 'semester', 'shift', 'day_of_week', 'teacher', 'is_active']
    ordering_fields = ['day_of_week', 'start_time', 'created_at']
    ordering = ['day_of_week', 'start_time']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ClassRoutineCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ClassRoutineUpdateSerializer
        else:
            return ClassRoutineSerializer
    
    def create(self, request, *args, **kwargs):
        """Create class routine with validation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return complete routine data
        routine = ClassRoutine.objects.get(pk=serializer.instance.pk)

        # Notify only when the routine for this department/semester/shift is first
        # published (the first entry), to avoid an email per individual class slot.
        is_first = ClassRoutine.objects.filter(
            department=routine.department, semester=routine.semester, shift=routine.shift
        ).count() <= 1
        if is_first:
            _notify_routine(routine, is_update=False)

        # New routine subject should appear in student profile attendance.
        _sync_routine_cohorts([routine])

        response_serializer = ClassRoutineSerializer(routine)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update class routine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return complete routine data
        routine = ClassRoutine.objects.get(pk=instance.pk)
        _notify_routine(routine, is_update=True)
        _sync_routine_cohorts([routine])
        response_serializer = ClassRoutineSerializer(routine)

        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-routine')
    def my_routine(self, request):
        """
        Get routine for current user (student or teacher)
        
        GET /api/class-routines/my-routine/
        
        Query params for students:
        - department: Department ID (required for students)
        - semester: Semester number (required for students)
        - shift: Shift (required for students)
        
        Query params for teachers:
        - teacher: Teacher ID (required for teachers)
        """
        # Check if requesting as student or teacher
        teacher_id = request.query_params.get('teacher')
        
        if teacher_id:
            # Teacher routine
            routines = ClassRoutine.objects.filter(
                teacher_id=teacher_id,
                is_active=True
            )
        else:
            # Student routine
            department = request.query_params.get('department')
            semester = request.query_params.get('semester')
            shift = request.query_params.get('shift')
            
            if not all([department, semester, shift]):
                return Response(
                    {
                        'error': 'Missing parameters',
                        'details': 'For student routine, provide department, semester, and shift'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                semester = int(semester)
                if semester < 1 or semester > 8:
                    return Response(
                        {
                            'error': 'Invalid semester',
                            'details': 'Semester must be between 1 and 8'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {
                        'error': 'Invalid semester',
                        'details': 'Semester must be a valid integer'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            routines = ClassRoutine.objects.filter(
                department_id=department,
                semester=semester,
                shift=shift,
                is_active=True
            )
        
        # Order by day and time
        routines = routines.order_by('day_of_week', 'start_time')
        
        serializer = ClassRoutineSerializer(routines, many=True)
        return Response({
            'count': routines.count(),
            'routines': serializer.data
        })
    
    @action(detail=True, methods=['get'], url_path='class-students')
    def class_students(self, request, pk=None):
        """
        Students enrolled in this routine's class (teacher of the class only).

        GET /api/class-routines/{id}/class-students/
        """
        routine = self.get_object()
        if not _may_email_routine_class(request.user, routine):
            return Response(
                {'error': 'You can only view students of your own classes'},
                status=status.HTTP_403_FORBIDDEN,
            )

        students = _routine_class_students(routine)
        data = [
            {
                'id': str(student.id),
                'name': student.fullNameEnglish,
                'roll': student.currentRollNumber,
                'email': student.email or None,
            }
            for student in students
        ]
        return Response({
            'count': len(data),
            'with_email': sum(1 for row in data if row['email']),
            'students': data,
        })

    @action(
        detail=True,
        methods=['post'],
        url_path='send-class-email',
        parser_classes=[MultiPartParser, FormParser],
    )
    def send_class_email(self, request, pk=None):
        """
        Send a custom email (reminder/announcement) to every student in this
        routine's class. Teacher of the class (or admin) only.

        POST /api/class-routines/{id}/send-class-email/  (multipart)
          - subject: str (required)
          - message: str (required; newlines become paragraphs)
          - class_date: str (optional, shown in the email details)
          - attachments: file[] (optional, 10 MB total)
        """
        routine = self.get_object()
        if not _may_email_routine_class(request.user, routine):
            return Response(
                {'error': 'You can only email students of your own classes'},
                status=status.HTTP_403_FORBIDDEN,
            )

        subject = (request.data.get('subject') or '').strip()
        message = (request.data.get('message') or '').strip()
        class_date = (request.data.get('class_date') or '').strip()
        if not subject or not message:
            return Response(
                {'error': 'Both subject and message are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        files = request.FILES.getlist('attachments')
        total_size = sum(f.size for f in files)
        if total_size > MAX_CLASS_EMAIL_ATTACHMENT_BYTES:
            return Response(
                {'error': 'Attachments are too large (10 MB total limit)'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        attachments = [
            (f.name, f.read(), f.content_type or 'application/octet-stream')
            for f in files
        ]

        students = list(_routine_class_students(routine))
        emails = sorted({
            s.email.strip().lower() for s in students if s.email and s.email.strip()
        })
        skipped_no_email = len(students) - len(emails)
        if not emails:
            return Response(
                {'error': 'No students in this class have an email address on file'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher_name = getattr(routine.teacher, 'fullNameEnglish', None) or 'Your teacher'
        dept_name = getattr(routine.department, 'name', '') or ''
        details = [
            {'label': 'Subject', 'value': f"{routine.subject_name} ({routine.subject_code})"},
            {'label': 'Class', 'value': f"{dept_name} · Semester {routine.semester} · {routine.shift} shift"},
            {'label': 'Teacher', 'value': teacher_name},
        ]
        if class_date:
            details.append({'label': 'Date', 'value': class_date})

        from apps.notifications.email_service import send_branded_email
        # Send synchronously so we can report real delivery status; recipients
        # go in BCC so students never see each other's addresses.
        sent = send_branded_email(
            subject,
            [],
            bcc=emails,
            heading=subject,
            greeting='Dear Student,',
            intro=f"You have a message from {teacher_name} about your {routine.subject_name} class.",
            body_lines=[line for line in message.splitlines() if line.strip()],
            details=details,
            accent_label='Class Announcement',
            accent_color='#059669',
            accent_soft='#ecfdf5',
            closing='Please check your class routine for any schedule details.',
            async_send=False,
            attachments=attachments,
        )

        if not sent:
            return Response(
                {
                    'success': False,
                    'error': 'The email could not be sent. Please try again or contact the administrator.',
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'success': True,
            'recipients': len(emails),
            'skipped_no_email': skipped_no_email,
            'attachments': len(attachments),
        })

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """
        Perform bulk operations on class routines
        
        POST /api/class-routines/bulk-update/
        
        Request body:
        {
            "operations": [
                {
                    "operation": "create",
                    "data": {
                        "department": "uuid",
                        "semester": 1,
                        "shift": "Morning",
                        "session": "2024",
                        "day_of_week": "Sunday",
                        "start_time": "08:00",
                        "end_time": "08:45",
                        "subject_name": "Mathematics",
                        "subject_code": "MATH101",
                        "teacher": "uuid",
                        "room_number": "101",
                        "is_active": true
                    }
                },
                {
                    "operation": "update",
                    "id": "routine-uuid",
                    "data": {
                        "subject_name": "Advanced Mathematics",
                        "room_number": "102"
                    }
                },
                {
                    "operation": "delete",
                    "id": "routine-uuid"
                }
            ]
        }
        """
        
        serializer = BulkRoutineRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        operations = serializer.validated_data['operations']
        results = []
        errors = []
        
        

        
        # Process operations individually to avoid rolling back all changes on single failure
        for i, operation_data in enumerate(operations):
            operation = operation_data['operation']
            routine_id = operation_data.get('id')
            data = operation_data.get('data', {})
            
            try:
                with transaction.atomic():
                    if operation == 'create':
                        # Create new routine
                        create_serializer = ClassRoutineCreateSerializer(data=data)
                        create_serializer.is_valid(raise_exception=True)
                        routine = create_serializer.save()
                        
                        # Return complete routine data
                        result_serializer = ClassRoutineSerializer(routine)
                        results.append({
                            'operation': operation,
                            'success': True,
                            'data': result_serializer.data
                        })
                    
                    elif operation == 'update':
                        # Update existing routine
                        try:
                            routine = ClassRoutine.objects.get(pk=routine_id)
                            update_serializer = ClassRoutineUpdateSerializer(
                                routine, data=data, partial=True
                            )
                            update_serializer.is_valid(raise_exception=True)
                            routine = update_serializer.save()
                            
                            # Return complete routine data
                            result_serializer = ClassRoutineSerializer(routine)
                            results.append({
                                'operation': operation,
                                'success': True,
                                'data': result_serializer.data
                            })
                        except ClassRoutine.DoesNotExist:
                            errors.append({
                                'operation_index': i,
                                'operation': operation,
                                'error': 'Class routine not found',
                                'id': str(routine_id)
                            })
                    
                    elif operation == 'delete':
                        # Delete routine
                        try:
                            routine = ClassRoutine.objects.get(pk=routine_id)
                            routine.delete()
                            results.append({
                                'operation': operation,
                                'success': True,
                                'id': str(routine_id)
                            })
                        except ClassRoutine.DoesNotExist:
                            errors.append({
                                'operation_index': i,
                                'operation': operation,
                                'error': 'Class routine not found',
                                'id': str(routine_id)
                            })
            
            except Exception as e:
                errors.append({
                    'operation_index': i,
                    'operation': operation,
                    'error': str(e) if settings.DEBUG else None,
                    'id': str(routine_id) if routine_id else None
                })
        
        # Sync student-profile attendance subjects for all affected cohorts.
        touched = []
        for result in results:
            data = result.get('data')
            if not data:
                continue
            try:
                routine = ClassRoutine.objects.select_related('department').get(pk=data['id'])
                touched.append(routine)
            except ClassRoutine.DoesNotExist:
                continue
        if touched:
            _sync_routine_cohorts(touched)

        # Return success even if some operations failed (partial success)
        success_count = len(results)
        total_count = len(operations)
        
        if success_count == 0:
            # All operations failed
            return Response({
                'success': False,
                'message': 'All operations failed',
                'errors': errors,
                'completed_operations': 0,
                'total_operations': total_count
            }, status=status.HTTP_400_BAD_REQUEST)
        elif errors:
            # Partial success
            return Response({
                'success': True,
                'message': f'Completed {success_count} of {total_count} operations with some errors',
                'results': results,
                'errors': errors,
                'completed_operations': success_count,
                'total_operations': total_count
            }, status=status.HTTP_200_OK)
        
        # All operations successful
        return Response({
            'success': True,
            'message': f'Successfully completed {len(results)} operations',
            'results': results,
            'completed_operations': len(results),
            'total_operations': len(operations)
        }, status=status.HTTP_200_OK)
