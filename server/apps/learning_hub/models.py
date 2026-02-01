"""
Learning Hub Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Subject(models.Model):
    """Subject model for organizing learning content"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey('departments.Department', on_delete=models.CASCADE)
    semester = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    teacher = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    color = models.CharField(max_length=50, default='bg-blue-500')  # CSS color class
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'learning_hub_subjects'
        ordering = ['department', 'semester', 'name']
        unique_together = ['code', 'department']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ClassActivity(models.Model):
    """Class activities and lessons"""
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('today', 'Today'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    ACTIVITY_TYPES = [
        ('lecture', 'Lecture'),
        ('lab', 'Lab Session'),
        ('tutorial', 'Tutorial'),
        ('presentation', 'Presentation'),
        ('exam', 'Exam'),
        ('quiz', 'Quiz'),
        ('assignment', 'Assignment Discussion'),
        ('project', 'Project Work'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='activities')
    title = models.CharField(max_length=255)
    description = models.TextField()
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES, default='lecture')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    
    # Scheduling
    scheduled_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=255, blank=True)  # Room number or online link
    
    # Content
    topics_covered = models.JSONField(default=list, blank=True)  # List of topics
    materials = models.JSONField(default=list, blank=True)  # List of material references
    notes = models.TextField(blank=True)
    
    # Attendance tracking
    attendance_taken = models.BooleanField(default=False)
    total_students = models.IntegerField(default=0)
    present_students = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'learning_hub_activities'
        ordering = ['-scheduled_date', '-start_time']
    
    def __str__(self):
        return f"{self.subject.code} - {self.title} ({self.scheduled_date})"


class Assignment(models.Model):
    """Student assignments"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
        ('graded', 'Graded'),
        ('late', 'Late'),
        ('overdue', 'Overdue'),
    ]
    
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('important', 'Important'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=255)
    description = models.TextField()
    instructions = models.TextField(blank=True)
    
    # Scheduling
    assigned_date = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    # Grading
    max_marks = models.IntegerField(default=100)
    weightage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)  # Percentage of total grade
    
    # Files and attachments
    attachments = models.JSONField(default=list, blank=True)  # List of file paths
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'learning_hub_assignments'
        ordering = ['-deadline']
    
    def __str__(self):
        return f"{self.subject.code} - {self.title}"


class AssignmentSubmission(models.Model):
    """Student assignment submissions"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('graded', 'Graded'),
        ('returned', 'Returned for Revision'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    
    # Submission content
    submission_text = models.TextField(blank=True)
    attachments = models.JSONField(default=list, blank=True)  # List of submitted files
    
    # Timing
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    
    # Grading
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=10, blank=True)  # A+, A, B+, etc.
    feedback = models.TextField(blank=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'learning_hub_submissions'
        unique_together = ['assignment', 'student']
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} - {self.assignment.title}"


class StudyMaterial(models.Model):
    """Study materials and resources"""
    MATERIAL_TYPES = [
        ('pdf', 'PDF Document'),
        ('ebook', 'E-Book'),
        ('video', 'Video Lecture'),
        ('slide', 'Presentation Slides'),
        ('document', 'Document'),
        ('link', 'External Link'),
        ('audio', 'Audio Recording'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Organization
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='materials')
    department = models.ForeignKey('departments.Department', on_delete=models.CASCADE)
    semester = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    shift = models.CharField(max_length=20, choices=[('Morning', 'Morning'), ('Day', 'Day'), ('Evening', 'Evening')])
    
    # Content
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES)
    file_path = models.CharField(max_length=500, blank=True)  # Path to file or URL
    file_size = models.BigIntegerField(null=True, blank=True)  # Size in bytes
    duration = models.DurationField(null=True, blank=True)  # For videos/audio
    
    # Metadata
    uploaded_by = models.ForeignKey('teachers.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    access_count = models.IntegerField(default=0)
    
    # Permissions
    is_public = models.BooleanField(default=True)
    allowed_semesters = models.JSONField(default=list, blank=True)  # List of allowed semesters
    
    # Tags and search
    tags = models.JSONField(default=list, blank=True)  # List of tags for search
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'learning_hub_materials'
        ordering = ['-upload_date']
        indexes = [
            models.Index(fields=['material_type']),
            models.Index(fields=['department', 'semester']),
            models.Index(fields=['subject']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.material_type})"


class MaterialAccess(models.Model):
    """Track material access by students"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    material = models.ForeignKey(StudyMaterial, on_delete=models.CASCADE, related_name='accesses')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    
    accessed_at = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.IntegerField(default=0)  # How long they accessed it
    completed = models.BooleanField(default=False)  # For videos/documents
    
    class Meta:
        db_table = 'learning_hub_material_access'
        ordering = ['-accessed_at']
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} accessed {self.material.title}"