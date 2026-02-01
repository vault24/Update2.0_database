"""
Live Classes Views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone
from datetime import datetime, timedelta

from .models import LiveClass, ClassRecording, ClassParticipant
from .serializers import (
    LiveClassSerializer, LiveClassDetailSerializer,
    ClassRecordingSerializer, ClassParticipantSerializer
)


class LiveClassViewSet(viewsets.ReadOnlyModelViewSet):
    """Live class viewset for students"""
    queryset = LiveClass.objects.all()
    serializer_class = LiveClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'status', 'platform']
    search_fields = ['title', 'description', 'subject__name']
    ordering_fields = ['scheduled_date', 'start_time', 'created_at']
    ordering = ['scheduled_date', 'start_time']
    
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
            return LiveClassDetailSerializer
        return LiveClassSerializer
    
    @action(detail=False, methods=['get'])
    def live_now(self, request):
        """Get currently live classes"""
        now = timezone.now()
        live_classes = self.get_queryset().filter(
            status='live',
            scheduled_date=now.date(),
            start_time__lte=now.time(),
            end_time__gte=now.time()
        )
        serializer = self.get_serializer(live_classes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's classes"""
        today = timezone.now().date()
        classes = self.get_queryset().filter(scheduled_date=today)
        serializer = self.get_serializer(classes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming classes"""
        now = timezone.now()
        classes = self.get_queryset().filter(
            Q(scheduled_date__gt=now.date()) |
            Q(scheduled_date=now.date(), start_time__gt=now.time())
        ).order_by('scheduled_date', 'start_time')[:10]
        serializer = self.get_serializer(classes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """Get classes grouped by date"""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        queryset = self.get_queryset()
        
        if date_from:
            queryset = queryset.filter(scheduled_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(scheduled_date__lte=date_to)
        
        # Group by date
        classes_by_date = {}
        for live_class in queryset:
            date_str = live_class.scheduled_date.isoformat()
            if date_str not in classes_by_date:
                classes_by_date[date_str] = []
            classes_by_date[date_str].append(
                self.get_serializer(live_class).data
            )
        
        return Response(classes_by_date)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a live class"""
        live_class = self.get_object()
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can join classes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        now = timezone.now()
        
        # Check if class is available to join
        if live_class.status not in ['scheduled', 'live']:
            return Response(
                {'error': 'Class is not available to join'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if it's time to join (allow 15 minutes before start)
        class_datetime = timezone.make_aware(
            datetime.combine(live_class.scheduled_date, live_class.start_time)
        )
        join_time = class_datetime - timedelta(minutes=15)
        
        if now < join_time:
            return Response(
                {'error': 'Class is not yet available to join'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Record attendance
        attendance, created = ClassParticipant.objects.get_or_create(
            live_class=live_class,
            student=student,
            defaults={
                'joined_at': now,
                'is_present': True
            }
        )
        
        if not created and not attendance.is_present:
            attendance.joined_at = now
            attendance.is_present = True
            attendance.save()
        
        # Update class status to live if not already
        if live_class.status == 'scheduled':
            live_class.status = 'live'
            live_class.save()
        
        return Response({
            'meeting_link': live_class.meeting_link,
            'meeting_id': live_class.meeting_id,
            'meeting_password': live_class.meeting_password,
            'joined_at': attendance.joined_at
        })
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a live class"""
        live_class = self.get_object()
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can leave classes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        
        try:
            attendance = ClassParticipant.objects.get(
                live_class=live_class,
                student=student
            )
            attendance.left_at = timezone.now()
            attendance.save()
            
            return Response({'message': 'Left class successfully'})
        except ClassParticipant.DoesNotExist:
            return Response(
                {'error': 'No attendance record found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ClassRecordingViewSet(viewsets.ReadOnlyModelViewSet):
    """Class recording viewset"""
    queryset = ClassRecording.objects.all()
    serializer_class = ClassRecordingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['live_class__subject', 'recording_type']
    search_fields = ['live_class__title', 'live_class__subject__name']
    ordering_fields = ['created_at', 'duration_seconds', 'view_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by student's subjects if student
        if hasattr(user, 'student_profile'):
            student = user.student_profile
            queryset = queryset.filter(
                live_class__subject__department=student.department,
                live_class__subject__semester=student.semester
            )
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Track view when accessing recording"""
        instance = self.get_object()
        
        # Increment view count
        instance.view_count += 1
        instance.last_viewed = timezone.now()
        instance.save(update_fields=['view_count', 'last_viewed'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent recordings"""
        recordings = self.get_queryset()[:20]
        serializer = self.get_serializer(recordings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular recordings by view count"""
        recordings = self.get_queryset().order_by('-view_count')[:20]
        serializer = self.get_serializer(recordings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_subject(self, request):
        """Get recordings grouped by subject"""
        subject_id = request.query_params.get('subject_id')
        
        queryset = self.get_queryset()
        if subject_id:
            queryset = queryset.filter(live_class__subject_id=subject_id)
        
        # Group by subject
        recordings_by_subject = {}
        for recording in queryset:
            subject_name = recording.live_class.subject.name
            if subject_name not in recordings_by_subject:
                recordings_by_subject[subject_name] = []
            recordings_by_subject[subject_name].append(
                self.get_serializer(recording).data
            )
        
        return Response(recordings_by_subject)


class DashboardViewSet(viewsets.ViewSet):
    """Live classes dashboard"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get dashboard data"""
        user = request.user
        
        if not hasattr(user, 'student_profile'):
            return Response(
                {'error': 'Only students can access live classes dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student = user.student_profile
        now = timezone.now()
        today = now.date()
        
        # Get student's subjects
        from apps.learning_hub.models import Subject
        subjects = Subject.objects.filter(
            department=student.department,
            semester=student.semester,
            is_active=True
        )
        
        # Live now
        live_now = LiveClass.objects.filter(
            subject__in=subjects,
            status='live',
            scheduled_date=today,
            start_time__lte=now.time(),
            end_time__gte=now.time()
        )
        
        # Today's classes
        today_classes = LiveClass.objects.filter(
            subject__in=subjects,
            scheduled_date=today
        ).exclude(id__in=live_now.values_list('id', flat=True))
        
        # Upcoming classes (next 7 days)
        upcoming_classes = LiveClass.objects.filter(
            subject__in=subjects,
            scheduled_date__gt=today,
            scheduled_date__lte=today + timedelta(days=7),
            status__in=['scheduled']
        ).order_by('scheduled_date', 'start_time')[:10]
        
        # Recent recordings
        recent_recordings = ClassRecording.objects.filter(
            live_class__subject__in=subjects
        ).order_by('-created_at')[:10]
        
        # Attendance statistics
        total_classes = LiveClass.objects.filter(
            subject__in=subjects,
            status='ended'
        ).count()
        
        attended_classes = ClassParticipant.objects.filter(
            live_class__subject__in=subjects,
            student=student,
            is_present=True
        ).count()
        
        attendance_rate = round(
            (attended_classes / total_classes * 100) if total_classes > 0 else 0, 1
        )
        
        dashboard_data = {
            'live_now': LiveClassSerializer(live_now, many=True).data,
            'today_classes': LiveClassSerializer(today_classes, many=True).data,
            'upcoming_classes': LiveClassSerializer(upcoming_classes, many=True).data,
            'recent_recordings': ClassRecordingSerializer(recent_recordings, many=True).data,
            'statistics': {
                'total_classes': total_classes,
                'attended_classes': attended_classes,
                'attendance_rate': attendance_rate,
                'live_now_count': live_now.count(),
                'today_count': today_classes.count(),
                'upcoming_count': upcoming_classes.count(),
                'recordings_count': recent_recordings.count()
            }
        }
        
        return Response(dashboard_data)