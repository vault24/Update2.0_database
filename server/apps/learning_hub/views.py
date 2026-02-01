"""
Learning Hub Views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta

from .models import (
    Subject, ClassActivity, Assignment, AssignmentSubmission,
    StudyMaterial, MaterialAccess
)
from .serializers import (
    SubjectSerializer, ClassActivitySerializer, ClassActivityDetailSerializer,
    AssignmentSerializer, AssignmentDetailSerializer, AssignmentSubmissionSerializer,
    StudyMaterialSerializer, StudyMaterialDetailSerializer, MaterialAccessSerializer
)


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """Subject viewset for students"""
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'semester']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'semester']
    ordering = ['semester', 'name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by student's department and semester if student
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            queryset = queryset.filter(
                department=student.department,
                semester=student.semester
            )
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """Get activities for a subject"""
        subject = self.get_object()
        activities = ClassActivity.objects.filter(subject=subject).order_by('-scheduled_date', '-start_time')
        
        # Filter by date range if provided
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            activities = activities.filter(scheduled_date__gte=date_from)
        if date_to:
            activities = activities.filter(scheduled_date__lte=date_to)
        
        serializer = ClassActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def assignments(self, request, pk=None):
        """Get assignments for a subject"""
        subject = self.get_object()
        assignments = Assignment.objects.filter(subject=subject, is_active=True).order_by('-deadline')
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            assignments = assignments.filter(status=status_filter)
        
        serializer = AssignmentDetailSerializer(assignments, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        """Get study materials for a subject"""
        subject = self.get_object()
        materials = StudyMaterial.objects.filter(subject=subject, is_public=True).order_by('-upload_date')
        
        # Filter by material type if provided
        material_type = request.query_params.get('type')
        if material_type:
            materials = materials.filter(material_type=material_type)
        
        serializer = StudyMaterialDetailSerializer(materials, many=True, context={'request': request})
        return Response(serializer.data)


class ClassActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """Class activity viewset"""
    queryset = ClassActivity.objects.all()
    serializer_class = ClassActivitySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'activity_type', 'status']
    search_fields = ['title', 'description']
    ordering_fields = ['scheduled_date', 'start_time', 'created_at']
    ordering = ['-scheduled_date', '-start_time']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by student's subjects if student
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            queryset = queryset.filter(
                subject__department=student.department,
                subject__semester=student.semester
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClassActivityDetailSerializer
        return ClassActivitySerializer
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's activities"""
        today = timezone.now().date()
        activities = self.get_queryset().filter(scheduled_date=today)
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming activities"""
        today = timezone.now().date()
        activities = self.get_queryset().filter(
            scheduled_date__gt=today,
            status__in=['upcoming', 'today']
        )[:10]
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)


class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Assignment viewset"""
    queryset = Assignment.objects.filter(is_active=True)
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'status', 'priority']
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'assigned_date', 'priority']
    ordering = ['deadline']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by student's subjects if student
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            queryset = queryset.filter(
                subject__department=student.department,
                subject__semester=student.semester
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AssignmentDetailSerializer
        return AssignmentSerializer
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending assignments"""
        assignments = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue assignments"""
        now = timezone.now()
        assignments = self.get_queryset().filter(
            deadline__lt=now,
            status='pending'
        )
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit assignment"""
        assignment = self.get_object()
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can submit assignments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        
        # Check if already submitted
        existing_submission = AssignmentSubmission.objects.filter(
            assignment=assignment,
            student=student
        ).first()
        
        if existing_submission and existing_submission.status == 'submitted':
            return Response(
                {'error': 'Assignment already submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update submission
        submission_data = request.data.copy()
        submission_data['assignment'] = assignment.id
        submission_data['student'] = student.id
        submission_data['submitted_at'] = timezone.now()
        submission_data['is_late'] = timezone.now() > assignment.deadline
        submission_data['status'] = 'submitted'
        
        if existing_submission:
            serializer = AssignmentSubmissionSerializer(
                existing_submission, 
                data=submission_data, 
                partial=True
            )
        else:
            serializer = AssignmentSubmissionSerializer(data=submission_data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudyMaterialViewSet(viewsets.ReadOnlyModelViewSet):
    """Study material viewset"""
    queryset = StudyMaterial.objects.filter(is_public=True)
    serializer_class = StudyMaterialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'department', 'semester', 'shift', 'material_type']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['upload_date', 'access_count', 'title']
    ordering = ['-upload_date']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by student's department and semester if student
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            queryset = queryset.filter(
                Q(department=student.department) |
                Q(allowed_semesters__contains=[student.semester]) |
                Q(allowed_semesters=[])  # Empty means all semesters
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudyMaterialDetailSerializer
        return StudyMaterialSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """Track material access when retrieving"""
        instance = self.get_object()
        
        # Track access if student
        if hasattr(request.user, 'student_profile'):
            MaterialAccess.objects.create(
                material=instance,
                student=request.user.student_profile
            )
            
            # Update access count and last accessed
            instance.access_count += 1
            instance.last_accessed = timezone.now()
            instance.save(update_fields=['access_count', 'last_accessed'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get materials grouped by type"""
        materials = self.get_queryset()
        
        grouped = {}
        for material_type, label in StudyMaterial.MATERIAL_TYPES:
            type_materials = materials.filter(material_type=material_type)[:10]
            if type_materials:
                grouped[material_type] = {
                    'label': label,
                    'materials': self.get_serializer(type_materials, many=True).data
                }
        
        return Response(grouped)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recently uploaded materials"""
        materials = self.get_queryset()[:20]
        serializer = self.get_serializer(materials, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular materials by access count"""
        materials = self.get_queryset().order_by('-access_count')[:20]
        serializer = self.get_serializer(materials, many=True)
        return Response(serializer.data)


class DashboardViewSet(viewsets.ViewSet):
    """Learning hub dashboard"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get dashboard data"""
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can access learning hub dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        today = timezone.now().date()
        
        # Get student's subjects
        subjects = Subject.objects.filter(
            department=student.department,
            semester=student.semester,
            is_active=True
        )
        
        # Today's activities
        today_activities = ClassActivity.objects.filter(
            subject__in=subjects,
            scheduled_date=today
        ).order_by('start_time')
        
        # Pending assignments
        pending_assignments = Assignment.objects.filter(
            subject__in=subjects,
            is_active=True,
            status='pending'
        ).order_by('deadline')[:5]
        
        # Recent materials
        recent_materials = StudyMaterial.objects.filter(
            subject__in=subjects,
            is_public=True
        ).order_by('-upload_date')[:10]
        
        # Assignment statistics
        total_assignments = Assignment.objects.filter(subject__in=subjects, is_active=True).count()
        my_submissions = AssignmentSubmission.objects.filter(
            assignment__subject__in=subjects,
            student=student
        )
        submitted_count = my_submissions.filter(status__in=['submitted', 'graded']).count()
        
        # Activity statistics
        total_activities = ClassActivity.objects.filter(subject__in=subjects).count()
        completed_activities = ClassActivity.objects.filter(
            subject__in=subjects,
            status='completed'
        ).count()
        
        dashboard_data = {
            'subjects': SubjectSerializer(subjects, many=True).data,
            'today_activities': ClassActivitySerializer(today_activities, many=True).data,
            'pending_assignments': AssignmentDetailSerializer(
                pending_assignments, 
                many=True, 
                context={'request': request}
            ).data,
            'recent_materials': StudyMaterialSerializer(recent_materials, many=True).data,
            'statistics': {
                'total_subjects': subjects.count(),
                'total_assignments': total_assignments,
                'submitted_assignments': submitted_count,
                'completion_rate': round((submitted_count / total_assignments * 100) if total_assignments > 0 else 0, 1),
                'total_activities': total_activities,
                'completed_activities': completed_activities,
                'activity_completion_rate': round((completed_activities / total_activities * 100) if total_activities > 0 else 0, 1),
                'total_materials': recent_materials.count()
            }
        }
        
        return Response(dashboard_data)