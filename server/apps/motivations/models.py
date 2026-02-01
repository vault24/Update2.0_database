from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class MotivationMessage(models.Model):
    """
    Model for storing motivational messages with multilingual support
    """
    CATEGORY_CHOICES = [
        ('success', 'Success'),
        ('inspiration', 'Inspiration'),
        ('encouragement', 'Encouragement'),
        ('wisdom', 'Wisdom'),
        ('academic', 'Academic'),
        ('career', 'Career'),
        ('personal', 'Personal Development'),
        ('spiritual', 'Spiritual'),
    ]
    
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('bn', 'Bengali'),
        ('ar', 'Arabic'),
        ('ur', 'Urdu'),
        ('hi', 'Hindi'),
    ]
    
    DISPLAY_DURATION_CHOICES = [
        (5, '5 seconds'),
        (10, '10 seconds'),
        (15, '15 seconds'),
        (30, '30 seconds'),
        (60, '1 minute'),
        (300, '5 minutes'),
        (600, '10 minutes'),
        (1800, '30 minutes'),
        (3600, '1 hour'),
        (86400, '1 day'),
    ]

    # Basic Information
    title = models.CharField(max_length=200, help_text="Title of the motivational message")
    message = models.TextField(help_text="The motivational message content")
    author = models.CharField(max_length=100, help_text="Author or source of the message")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='inspiration')
    
    # Multilingual Support
    title_bn = models.CharField(max_length=200, blank=True, null=True, help_text="Title in Bengali")
    message_bn = models.TextField(blank=True, null=True, help_text="Message in Bengali")
    author_bn = models.CharField(max_length=100, blank=True, null=True, help_text="Author name in Bengali")
    
    title_ar = models.CharField(max_length=200, blank=True, null=True, help_text="Title in Arabic")
    message_ar = models.TextField(blank=True, null=True, help_text="Message in Arabic")
    author_ar = models.CharField(max_length=100, blank=True, null=True, help_text="Author name in Arabic")
    
    # Reference Information
    reference_source = models.CharField(max_length=200, blank=True, null=True, help_text="Source of the quote (book, speech, etc.)")
    reference_url = models.URLField(blank=True, null=True, help_text="URL reference if available")
    reference_date = models.DateField(blank=True, null=True, help_text="Date of the original quote/speech")
    reference_context = models.TextField(blank=True, null=True, help_text="Context or background of the quote")
    
    # Display Settings
    primary_language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default='en')
    display_duration = models.IntegerField(
        choices=DISPLAY_DURATION_CHOICES, 
        default=86400,
        help_text="How long to display this message before changing"
    )
    priority = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Priority level (1-10, higher numbers shown more frequently)"
    )
    
    # Status and Metadata
    is_active = models.BooleanField(default=True, help_text="Whether this message is active")
    is_featured = models.BooleanField(default=False, help_text="Featured messages appear more frequently")
    view_count = models.PositiveIntegerField(default=0, help_text="Number of times this message was viewed")
    like_count = models.PositiveIntegerField(default=0, help_text="Number of likes from students")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_motivations')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_motivations')
    
    # Scheduling
    start_date = models.DateTimeField(blank=True, null=True, help_text="When to start showing this message")
    end_date = models.DateTimeField(blank=True, null=True, help_text="When to stop showing this message")
    
    class Meta:
        db_table = 'motivation_messages'
        verbose_name = 'Motivation Message'
        verbose_name_plural = 'Motivation Messages'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['is_active', 'priority']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['primary_language', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def __str__(self):
        return f"{self.title} ({self.category})"
    
    def get_localized_title(self, language='en'):
        """Get title in specified language with fallback"""
        if language == 'bn' and self.title_bn:
            return self.title_bn
        elif language == 'ar' and self.title_ar:
            return self.title_ar
        return self.title
    
    def get_localized_message(self, language='en'):
        """Get message in specified language with fallback"""
        if language == 'bn' and self.message_bn:
            return self.message_bn
        elif language == 'ar' and self.message_ar:
            return self.message_ar
        return self.message
    
    def get_localized_author(self, language='en'):
        """Get author name in specified language with fallback"""
        if language == 'bn' and self.author_bn:
            return self.author_bn
        elif language == 'ar' and self.author_ar:
            return self.author_ar
        return self.author
    
    def increment_view_count(self):
        """Increment view count"""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    def increment_like_count(self):
        """Increment like count"""
        self.like_count += 1
        self.save(update_fields=['like_count'])
    
    @property
    def is_scheduled_active(self):
        """Check if message is active based on scheduling"""
        from django.utils import timezone
        now = timezone.now()
        
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True
    
    @property
    def effective_active_status(self):
        """Get effective active status considering scheduling"""
        return self.is_active and self.is_scheduled_active


class MotivationView(models.Model):
    """
    Track individual views of motivation messages for analytics
    """
    message = models.ForeignKey(MotivationMessage, on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    language_requested = models.CharField(max_length=5, default='en')
    
    class Meta:
        db_table = 'motivation_views'
        verbose_name = 'Motivation View'
        verbose_name_plural = 'Motivation Views'
        indexes = [
            models.Index(fields=['message', 'viewed_at']),
            models.Index(fields=['user', 'viewed_at']),
        ]


class MotivationLike(models.Model):
    """
    Track likes for motivation messages
    """
    message = models.ForeignKey(MotivationMessage, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'motivation_likes'
        verbose_name = 'Motivation Like'
        verbose_name_plural = 'Motivation Likes'
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['message', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]


class MotivationSettings(models.Model):
    """
    Global settings for motivation system
    """
    # Display Settings
    default_display_duration = models.IntegerField(default=86400, help_text="Default display duration in seconds")
    auto_rotate = models.BooleanField(default=True, help_text="Automatically rotate messages")
    rotation_interval = models.IntegerField(default=3600, help_text="Rotation interval in seconds")
    
    # Language Settings
    default_language = models.CharField(max_length=5, default='en', help_text="Default language for messages")
    enable_multilingual = models.BooleanField(default=True, help_text="Enable multilingual support")
    
    # Feature Flags
    enable_likes = models.BooleanField(default=True, help_text="Allow students to like messages")
    enable_analytics = models.BooleanField(default=True, help_text="Track views and analytics")
    enable_scheduling = models.BooleanField(default=True, help_text="Enable message scheduling")
    
    # Content Settings
    max_messages_per_day = models.IntegerField(default=5, help_text="Maximum messages to show per day")
    prioritize_featured = models.BooleanField(default=True, help_text="Show featured messages more frequently")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'motivation_settings'
        verbose_name = 'Motivation Settings'
        verbose_name_plural = 'Motivation Settings'
    
    def __str__(self):
        return f"Motivation Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
    
    @classmethod
    def get_settings(cls):
        """Get or create settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings