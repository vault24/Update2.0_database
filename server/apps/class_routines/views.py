"""
Class Routine Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db.models import Q
from django.db import transaction

from .models import ClassRoutine
from .serializers import (
    ClassRoutineSerializer,
    ClassRoutineCreateSerializer,
    ClassRoutineUpdateSerializer,
    BulkRoutineRequestSerializer
)


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
    permission_classes = [AllowAny]
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
        
        try:
            with transaction.atomic():
                for i, operation_data in enumerate(operations):
                    operation = operation_data['operation']
                    routine_id = operation_data.get('id')
                    data = operation_data.get('data', {})
                    
                    try:
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
                            'error': str(e),
                            'id': str(routine_id) if routine_id else None
                        })
                
                # If there are any errors, rollback the transaction
                if errors:
                    raise Exception('Bulk operation failed with errors')
        
        except Exception:
            # Transaction was rolled back, return errors
            return Response({
                'success': False,
                'message': 'Bulk operation failed. All changes have been rolled back.',
                'errors': errors,
                'completed_operations': 0,
                'total_operations': len(operations)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # All operations successful
        return Response({
            'success': True,
            'message': f'Successfully completed {len(results)} operations',
            'results': results,
            'completed_operations': len(results),
            'total_operations': len(operations)
        }, status=status.HTTP_200_OK)
