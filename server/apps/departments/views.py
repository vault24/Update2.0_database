"""
Department Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import ProtectedError
from django.conf import settings
from django.utils import timezone
from .models import Department
from .serializers import DepartmentSerializer, DepartmentListSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department CRUD operations
    
    Endpoints:
    - GET /api/departments/ - List all departments
    - POST /api/departments/ - Create new department
    - GET /api/departments/{id}/ - Get department details
    - PUT /api/departments/{id}/ - Update department
    - DELETE /api/departments/{id}/ - Delete department (protected if has students)
    - GET /api/departments/{id}/students/ - Get students in department
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return DepartmentListSerializer
        return DepartmentSerializer

    def create(self, request, *args, **kwargs):
        """Create a new department with proper error handling"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating department: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to create department', 'detail': str(e) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """Update a department with proper error handling"""
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating department: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to update department', 'detail': str(e) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete department with protection check
        Prevents deletion if department has enrolled students, teachers, or pending requests
        """
        try:
            instance = self.get_object()
            
            # Check for related records that would prevent deletion
            issues = []
            
            # Check students
            try:
                student_count = instance.student_set.count() if hasattr(instance, 'student_set') else 0
                if student_count > 0:
                    issues.append(f'{student_count} student(s)')
            except Exception:
                pass
            
            # Check teachers
            try:
                teacher_count = instance.teachers.count() if hasattr(instance, 'teachers') else 0
                if teacher_count > 0:
                    issues.append(f'{teacher_count} teacher(s)')
            except Exception:
                pass
            
            # Check teacher requests
            try:
                request_count = instance.teacherrequest_set.count() if hasattr(instance, 'teacherrequest_set') else 0
                if request_count > 0:
                    issues.append(f'{request_count} pending teacher request(s)')
            except Exception:
                pass
            
            # If there are any issues, prevent deletion
            if issues:
                return Response(
                    {
                        'error': 'Cannot delete department',
                        'detail': f'Department has {", ".join(issues)}. '
                                 'Please reassign or remove them before deleting the department.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Perform deletion
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except ProtectedError as e:
            return Response(
                {
                    'error': 'Cannot delete department',
                    'detail': 'Department is referenced by other records and cannot be deleted.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error deleting department: {str(e)}", exc_info=True)
            
            return Response(
                {
                    'error': 'Failed to delete department',
                    'detail': str(e) if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """
        Get department details with enrolled students grouped by semester
        GET /api/departments/{id}/
        
        Returns department info with students organized by semester
        """
        department = self.get_object()
        
        # Get all students in department
        students = department.student_set.filter(status='active')
        
        # Serializer context so photo/media URLs resolve to absolute URLs.
        ctx = self.get_serializer_context()

        # Group students by semester
        students_by_semester = {}
        for semester in range(1, 9):  # Semesters 1-8
            semester_students = students.filter(semester=semester)
            if semester_students.exists():
                from apps.students.serializers import StudentListSerializer
                students_by_semester[semester] = {
                    'count': semester_students.count(),
                    'students': StudentListSerializer(semester_students, many=True, context=ctx).data
                }

        # Get teachers in department (related_name='teachers')
        teachers = department.teachers.all()
        from apps.teachers.serializers import TeacherListSerializer

        # Build response
        response_data = DepartmentSerializer(department, context=ctx).data
        response_data['studentsBySemester'] = students_by_semester
        response_data['teachers'] = TeacherListSerializer(teachers, many=True, context=ctx).data
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """
        Get all students in this department with filtering
        Optional query params: 
        - semester (filter by semester)
        - shift (filter by shift: Morning, Day, Evening)
        - status (filter by status: active, inactive, graduated, discontinued)
        
        Example: GET /api/departments/{id}/students/?semester=3&shift=Morning
        """
        department = self.get_object()
        students = department.student_set.all()
        
        # Filter by semester if provided
        semester = request.query_params.get('semester')
        if semester:
            try:
                semester = int(semester)
                if semester < 1 or semester > 8:
                    return Response(
                        {'error': 'Invalid semester value. Must be between 1 and 8.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                students = students.filter(semester=semester)
            except ValueError:
                return Response(
                    {'error': 'Invalid semester value. Must be an integer.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Filter by shift if provided
        shift = request.query_params.get('shift')
        if shift:
            valid_shifts = ['Morning', 'Day', 'Evening']
            if shift not in valid_shifts:
                return Response(
                    {'error': f'Invalid shift value. Must be one of: {", ".join(valid_shifts)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            students = students.filter(shift=shift)
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            valid_statuses = ['active', 'inactive', 'graduated', 'discontinued']
            if status_filter not in valid_statuses:
                return Response(
                    {'error': f'Invalid status value. Must be one of: {", ".join(valid_statuses)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            students = students.filter(status=status_filter)
        
        # Import here to avoid circular dependency
        from apps.students.serializers import StudentListSerializer
        ctx = self.get_serializer_context()
        serializer = StudentListSerializer(students, many=True, context=ctx)

        return Response({
            'department': DepartmentSerializer(department, context=ctx).data,
            'students': serializer.data,
            'count': students.count(),
            'filters': {
                'semester': semester,
                'shift': shift,
                'status': status_filter
            }
        })

    @action(detail=True, methods=['post'], url_path='promote-students')
    def promote_students(self, request, pk=None):
        """
        Bulk-promote students of a department to the next semester WITHOUT
        requiring semester results/marks entry.

        POST /api/departments/{id}/promote-students/
        Body: {
            "semester": 3,                       # current semester to promote FROM
            "exclude_ids": ["uuid", ...]         # optional students to leave out
        }
        """
        from apps.students.models import Student

        if not (request.user.is_authenticated and request.user.is_admin()):
            return Response(
                {'error': 'Only administrators can promote students.'},
                status=status.HTTP_403_FORBIDDEN
            )

        department = self.get_object()

        try:
            semester = int(request.data.get('semester'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'A valid semester (1-8) is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if semester < 1 or semester > 8:
            return Response(
                {'error': 'Semester must be between 1 and 8.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if semester == 8:
            return Response(
                {'error': '8th semester students cannot be promoted further. '
                          'Use the alumni transition instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        exclude_ids = request.data.get('exclude_ids') or []
        if not isinstance(exclude_ids, list):
            return Response(
                {'error': 'exclude_ids must be a list of student IDs.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Keep only well-formed UUIDs so a bad value cannot crash the query.
        import uuid as _uuid
        valid_exclude_ids = []
        for raw in exclude_ids:
            try:
                valid_exclude_ids.append(_uuid.UUID(str(raw)))
            except (ValueError, AttributeError, TypeError):
                continue
        exclude_ids = valid_exclude_ids

        students = Student.objects.filter(
            department=department,
            semester=semester,
            status='active',
        )
        total_in_semester = students.count()

        to_promote = students.exclude(id__in=exclude_ids)
        promoted_ids = list(to_promote.values_list('id', flat=True))
        promoted_count = to_promote.update(
            semester=semester + 1,
            updatedAt=timezone.now(),
        )

        # Activity log (best-effort, never blocks the promotion).
        try:
            from apps.activity_logs.signals import log_activity
            log_activity(
                user=request.user,
                action_type='update',
                entity_type='Student',
                entity_id=str(department.id),
                description=(
                    f"Bulk promotion: promoted {promoted_count} student(s) of {department.name} "
                    f"from semester {semester} to {semester + 1} "
                    f"({len(exclude_ids)} excluded)"
                ),
                changes={
                    'fromSemester': semester,
                    'toSemester': semester + 1,
                    'promotedIds': [str(pk_) for pk_ in promoted_ids],
                    'excludedIds': [str(x) for x in exclude_ids],
                },
            )
        except Exception:  # noqa: BLE001 - logging must never break promotion
            pass

        return Response({
            'message': f'Successfully promoted {promoted_count} student(s) to semester {semester + 1}.',
            'department': department.name,
            'fromSemester': semester,
            'toSemester': semester + 1,
            'totalInSemester': total_in_semester,
            'promoted': promoted_count,
            'excluded': total_in_semester - promoted_count,
            'promotedIds': [str(pk_) for pk_ in promoted_ids],
        })
