"""
Live Classes Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class LiveClass(models.Model):
    """Live class sessions"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live Now'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    ]
    
    PLATFORM_CHOICES = [
        ('zoom', 'Zoom'),
        ('google_meet', 'Google Meet'),
        ('microsoft_teams', 'Microsoft Teams'),
        ('jitsi', 'Jitsi Meet'),
        ('webex', 'Cisco Webex'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    subject = models.ForeignKey('learning_hub.Subject', on_delete=models.CASCADE, related_name='live_classes')
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE)
    
    # Scheduling
    scheduled_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    timezone = models.CharField(max_length=50, default='Asia/Dhaka')
    
    # Meeting Details
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='zoom')
    meeting_link = models.URLField()
    meeting_id = models.CharField(max_length=100, blank=True)
    passcode = models.CharField(max_length=50, blank=True)
    
    # Status and Settings
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    is_recorded = models.BooleanField(default=False)
    recording_url = models.URLField(blank=True)
    max_participants = models.IntegerField(default=100)
    
    # Content and Materials
    agenda = models.JSONField(default=list, blank=True)  # List of agenda items
    materials = models.JSONField(default=list, blank=True)  # Pre-class materials
    
    # Notifications
    reminder_sent = models.BooleanField(default=False)
    notification_time = models.IntegerField(default=30)  # Minutes before class
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'live_classes'
        ordering = ['-scheduled_date', '-start_time']
        indexes = [
            models.Index(fields=['scheduled_date', 'status']),
            models.Index(fields=['subject']),
            models.Index(fields=['teacher']),
        ]
    
    def __str__(self):
        return f"{self.subject.code} - {self.title} ({self.scheduled_date})"


class ClassParticipant(models.Model):
    """Track class participants"""
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('guest', 'Guest'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    live_class = models.ForeignKey(LiveClass, on_delete=models.CASCADE, related_name='participants')
    
    # Participant can be student or teacher
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, null=True, blank=True)
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, null=True, blank=True)
    guest_name = models.CharField(max_length=255, blank=True)  # For guest participants
    guest_email = models.EmailField(blank=True)
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    
    # Participation tracking
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    is_present = models.BooleanField(default=False)
    
    # Interaction tracking
    questions_asked = models.IntegerField(default=0)
    chat_messages = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'live_class_participants'
        unique_together = [
            ['live_class', 'student'],
            ['live_class', 'teacher'],
        ]
        ordering = ['-joined_at']
    
    def __str__(self):
        if self.student:
            return f"{self.student.fullNameEnglish} in {self.live_class.title}"
        elif self.teacher:
            return f"{self.teacher.name} in {self.live_class.title}"
        else:
            return f"{self.guest_name} in {self.live_class.title}"


class ClassRecording(models.Model):
    """Class recordings and related content"""
    RECORDING_TYPES = [
        ('full', 'Full Class Recording'),
        ('highlight', 'Highlight Reel'),
        ('segment', 'Class Segment'),
        ('audio', 'Audio Only'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    live_class = models.ForeignKey(LiveClass, on_delete=models.CASCADE, related_name='recordings')
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    recording_type = models.CharField(max_length=20, choices=RECORDING_TYPES, default='full')
    
    # File information
    file_url = models.URLField()
    file_size = models.BigIntegerField(null=True, blank=True)  # Size in bytes
    duration_seconds = models.IntegerField(default=0)
    
    # Timestamps and chapters
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    chapters = models.JSONField(default=list, blank=True)  # List of chapter markers
    
    # Access control
    is_public = models.BooleanField(default=True)
    password_protected = models.BooleanField(default=False)
    access_password = models.CharField(max_length=50, blank=True)
    
    # Analytics
    view_count = models.IntegerField(default=0)
    download_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'live_class_recordings'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Recording: {self.title}"


class RecordingAccess(models.Model):
    """Track recording access by students"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recording = models.ForeignKey(ClassRecording, on_delete=models.CASCADE, related_name='accesses')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    
    # Access tracking
    accessed_at = models.DateTimeField(auto_now_add=True)
    watch_duration_seconds = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    last_position_seconds = models.IntegerField(default=0)  # Resume position
    
    # Interaction
    bookmarks = models.JSONField(default=list, blank=True)  # List of bookmarked timestamps
    notes = models.TextField(blank=True)
    rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    class Meta:
        db_table = 'live_class_recording_access'
        unique_together = ['recording', 'student']
        ordering = ['-accessed_at']
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} accessed {self.recording.title}"


class ClassChat(models.Model):
    """Chat messages during live classes"""
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('question', 'Question'),
        ('answer', 'Answer'),
        ('poll', 'Poll'),
        ('announcement', 'Announcement'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    live_class = models.ForeignKey(LiveClass, on_delete=models.CASCADE, related_name='chat_messages')
    
    # Sender information
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, null=True, blank=True)
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.CASCADE, null=True, blank=True)
    sender_name = models.CharField(max_length=255)  # Display name
    
    # Message content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    content = models.TextField()
    attachments = models.JSONField(default=list, blank=True)  # File attachments
    
    # Message metadata
    timestamp = models.DateTimeField(auto_now_add=True)
    is_private = models.BooleanField(default=False)  # Private message to teacher
    is_pinned = models.BooleanField(default=False)
    
    # Reactions and responses
    reactions = models.JSONField(default=dict, blank=True)  # Emoji reactions
    reply_to = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        db_table = 'live_class_chat'
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.sender_name}: {self.content[:50]}..."


class ClassPoll(models.Model):
    """Polls and quizzes during live classes"""
    POLL_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('rating', 'Rating Scale'),
        ('open_text', 'Open Text'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    live_class = models.ForeignKey(LiveClass, on_delete=models.CASCADE, related_name='polls')
    
    question = models.TextField()
    poll_type = models.CharField(max_length=20, choices=POLL_TYPES, default='multiple_choice')
    options = models.JSONField(default=list, blank=True)  # List of options for multiple choice
    
    # Settings
    is_anonymous = models.BooleanField(default=True)
    allow_multiple_answers = models.BooleanField(default=False)
    time_limit_seconds = models.IntegerField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'live_class_polls'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Poll: {self.question[:50]}..."


class PollResponse(models.Model):
    """Student responses to polls"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poll = models.ForeignKey(ClassPoll, on_delete=models.CASCADE, related_name='responses')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    
    # Response data
    selected_options = models.JSONField(default=list, blank=True)  # For multiple choice
    text_response = models.TextField(blank=True)  # For open text
    rating_value = models.IntegerField(null=True, blank=True)  # For rating scale
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'live_class_poll_responses'
        unique_together = ['poll', 'student']
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} - Poll Response"