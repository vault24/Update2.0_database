from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, Avg, Sum
from django.db.models.functions import TruncDate
from datetime import timedelta
import random
from .models import MotivationMessage, MotivationView, MotivationLike, MotivationSettings
from .serializers import (
    MotivationMessageSerializer, MotivationMessageListSerializer,
    MotivationMessageCreateUpdateSerializer, MotivationViewSerializer,
    MotivationLikeSerializer, MotivationSettingsSerializer,
    MotivationStatsSerializer, StudentMotivationSerializer
)


class MotivationMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing motivation messages
    """
    queryset = MotivationMessage.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MotivationMessageListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MotivationMessageCreateUpdateSerializer
        return MotivationMessageSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['language'] = self.request.GET.get('language', 'en')
        return context
    
    def get_queryset(self):
        queryset = MotivationMessage.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by language
        language = self.request.query_params.get('language')
        if language:
            queryset = queryset.filter(primary_language=language)
        
        # Filter by featured
        is_featured = self.request.query_params.get('is_featured')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(message__icontains=search) |
                Q(author__icontains=search) |
                Q(title_bn__icontains=search) |
                Q(message_bn__icontains=search) |
                Q(author_bn__icontains=search)
            )
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-priority')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get active motivation messages for students
        """
        now = timezone.now()
        queryset = MotivationMessage.objects.filter(
            is_active=True
        ).filter(
            Q(start_date__isnull=True) | Q(start_date__lte=now)
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        )
        
        # Apply language filter
        language = request.GET.get('language', 'en')
        
        # Prioritize featured messages
        settings = MotivationSettings.get_settings()
        if settings.prioritize_featured:
            featured_messages = list(queryset.filter(is_featured=True))
            regular_messages = list(queryset.filter(is_featured=False))
            
            # Weight featured messages more heavily
            weighted_messages = featured_messages * 3 + regular_messages
            if weighted_messages:
                # Shuffle and limit
                random.shuffle(weighted_messages)
                queryset = weighted_messages[:settings.max_messages_per_day]
        else:
            queryset = list(queryset)
            random.shuffle(queryset)
            queryset = queryset[:settings.max_messages_per_day]
        
        serializer = StudentMotivationSerializer(
            queryset, 
            many=True, 
            context={'language': language, 'request': request}
        )
        return Response({
            'count': len(queryset),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def random(self, request):
        """
        Get a random active motivation message
        """
        now = timezone.now()
        queryset = MotivationMessage.objects.filter(
            is_active=True
        ).filter(
            Q(start_date__isnull=True) | Q(start_date__lte=now)
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        )
        
        if not queryset.exists():
            return Response({'message': 'No active motivations available'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Weight by priority and featured status
        messages = list(queryset)
        weighted_messages = []
        
        for message in messages:
            weight = message.priority
            if message.is_featured:
                weight *= 2
            weighted_messages.extend([message] * weight)
        
        if weighted_messages:
            selected_message = random.choice(weighted_messages)
            language = request.GET.get('language', 'en')
            serializer = StudentMotivationSerializer(
                selected_message, 
                context={'language': language, 'request': request}
            )
            return Response(serializer.data)
        
        return Response({'message': 'No motivations available'}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        """
        Record a view for analytics
        """
        message = self.get_object()
        
        # Create view record
        view_data = {
            'message': message.id,
            'language_requested': request.GET.get('language', 'en'),
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }
        
        if request.user.is_authenticated:
            view_data['user'] = request.user.id
        
        view_serializer = MotivationViewSerializer(data=view_data)
        if view_serializer.is_valid():
            view_serializer.save()
            message.increment_view_count()
            return Response({'message': 'View recorded'})
        
        return Response(view_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post', 'delete'])
    def like(self, request, pk=None):
        """
        Like or unlike a motivation message
        """
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, 
                          status=status.HTTP_401_UNAUTHORIZED)
        
        message = self.get_object()
        
        if request.method == 'POST':
            like, created = MotivationLike.objects.get_or_create(
                message=message,
                user=request.user
            )
            if created:
                message.increment_like_count()
                return Response({'message': 'Liked', 'liked': True})
            else:
                return Response({'message': 'Already liked', 'liked': True})
        
        elif request.method == 'DELETE':
            try:
                like = MotivationLike.objects.get(message=message, user=request.user)
                like.delete()
                message.like_count = max(0, message.like_count - 1)
                message.save(update_fields=['like_count'])
                return Response({'message': 'Unliked', 'liked': False})
            except MotivationLike.DoesNotExist:
                return Response({'message': 'Not liked', 'liked': False})
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle active status of a motivation message
        """
        message = self.get_object()
        message.is_active = not message.is_active
        message.save(update_fields=['is_active'])
        
        return Response({
            'message': f'Message {"activated" if message.is_active else "deactivated"}',
            'is_active': message.is_active
        })
    
    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        """
        Toggle featured status of a motivation message
        """
        message = self.get_object()
        message.is_featured = not message.is_featured
        message.save(update_fields=['is_featured'])
        
        return Response({
            'message': f'Message {"featured" if message.is_featured else "unfeatured"}',
            'is_featured': message.is_featured
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get motivation system statistics
        """
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Basic stats
        total_messages = MotivationMessage.objects.count()
        active_messages = MotivationMessage.objects.filter(is_active=True).count()
        featured_messages = MotivationMessage.objects.filter(is_featured=True).count()
        
        # View and like stats
        total_views = MotivationMessage.objects.aggregate(
            total=Sum('view_count')
        )['total'] or 0
        
        total_likes = MotivationMessage.objects.aggregate(
            total=Sum('like_count')
        )['total'] or 0
        
        avg_views = MotivationMessage.objects.aggregate(
            avg=Avg('view_count')
        )['avg'] or 0
        
        avg_likes = MotivationMessage.objects.aggregate(
            avg=Avg('like_count')
        )['avg'] or 0
        
        # Most viewed and liked
        most_viewed = MotivationMessage.objects.order_by('-view_count').first()
        most_liked = MotivationMessage.objects.order_by('-like_count').first()
        
        # Recent activity
        recent_views = MotivationView.objects.filter(viewed_at__gte=week_ago).count()
        recent_likes = MotivationLike.objects.filter(created_at__gte=week_ago).count()
        
        # Time-based views
        views_today = MotivationView.objects.filter(viewed_at__date=today).count()
        views_this_week = MotivationView.objects.filter(viewed_at__gte=week_ago).count()
        views_this_month = MotivationView.objects.filter(viewed_at__gte=month_ago).count()
        
        # Category stats
        category_stats = dict(
            MotivationMessage.objects.values('category').annotate(
                count=Count('id')
            ).values_list('category', 'count')
        )
        
        # Language stats
        language_stats = dict(
            MotivationMessage.objects.values('primary_language').annotate(
                count=Count('id')
            ).values_list('primary_language', 'count')
        )
        
        stats_data = {
            'total_messages': total_messages,
            'active_messages': active_messages,
            'featured_messages': featured_messages,
            'total_views': total_views,
            'total_likes': total_likes,
            'avg_views_per_message': round(avg_views, 2),
            'avg_likes_per_message': round(avg_likes, 2),
            'most_viewed_message': MotivationMessageListSerializer(most_viewed).data if most_viewed else None,
            'most_liked_message': MotivationMessageListSerializer(most_liked).data if most_liked else None,
            'recent_views': recent_views,
            'recent_likes': recent_likes,
            'category_stats': category_stats,
            'language_stats': language_stats,
            'views_today': views_today,
            'views_this_week': views_this_week,
            'views_this_month': views_this_month,
        }
        
        return Response(stats_data)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class MotivationSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing motivation settings
    """
    queryset = MotivationSettings.objects.all()
    serializer_class = MotivationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Always return the singleton settings object"""
        return MotivationSettings.get_settings()
    
    def list(self, request, *args, **kwargs):
        """Return the settings object as a single item"""
        settings = self.get_object()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Update settings instead of creating new ones"""
        return self.update(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update the settings"""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        if hasattr(serializer, 'save'):
            serializer.save(updated_by=request.user)
        
        return Response(serializer.data)


class MotivationViewViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing motivation analytics
    """
    queryset = MotivationView.objects.all()
    serializer_class = MotivationViewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = MotivationView.objects.select_related('message', 'user')
        
        # Filter by message
        message_id = self.request.query_params.get('message')
        if message_id:
            queryset = queryset.filter(message_id=message_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(viewed_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(viewed_at__date__lte=end_date)
        
        return queryset.order_by('-viewed_at')


class MotivationLikeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing motivation likes
    """
    queryset = MotivationLike.objects.all()
    serializer_class = MotivationLikeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = MotivationLike.objects.select_related('message', 'user')
        
        # Filter by message
        message_id = self.request.query_params.get('message')
        if message_id:
            queryset = queryset.filter(message_id=message_id)
        
        return queryset.order_by('-created_at')