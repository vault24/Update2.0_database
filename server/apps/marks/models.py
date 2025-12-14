"""
Marks Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class MarksRecord(models.Model):
    """
    Marks record for tracking student marks/grades
    """
    # Exam type choices
    EXAM_TYPE_CHOICES = [
        ('midterm', 'Midterm'),
        ('final', 'Final'),
        ('assignment', 'Assignment'),
        ('practical', 'Practical'),
        ('quiz', 'Quiz'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Student Information
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='marks_records'
    )
    
    # Subject Information
    subject_code = models.CharField(max_length=50, blank=True)
    subject_name = models.CharField(max_length=255, blank=True)
    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(8)],
        null=True, blank=True
    )
    
    # Exam Information
    exam_type = models.CharField(max_length=50, choices=EXAM_TYPE_CHOICES, blank=True)
    
    # Marks Information
    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0
    )
    total_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0
    )
    
    # Recorded By
    recorded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_marks'
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    # Remarks
    remarks = models.TextField(blank=True)
    
    class Meta:
        db_table = 'marks_records'
        ordering = ['-recorded_at']
        verbose_name = 'Marks Record'
        verbose_name_plural = 'Marks Records'
        indexes = [
            models.Index(fields=['student', 'subject_code']),
            models.Index(fields=['semester']),
            models.Index(fields=['exam_type']),
        ]
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} - {self.subject_name} ({self.exam_type}): {self.marks_obtained}/{self.total_marks}"
    
    def percentage(self):
        """Calculate percentage"""
        if self.total_marks > 0:
            return (self.marks_obtained / self.total_marks) * 100
        return 0
