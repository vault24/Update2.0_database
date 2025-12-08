"""
Attendance Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class AttendanceRecord(models.Model):
    """
    Attendance record for tracking student attendance
    """
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Student Information
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    
    # Subject Information
    subject_code = models.CharField(max_length=50)
    subject_name = models.CharField(max_length=255)
    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(8)]
    )
    
    # Attendance Information
    date = models.DateField()
    is_present = models.BooleanField(default=False)
    
    # Recorded By
    recorded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_attendance'
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'attendance_records'
        ordering = ['-date']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        indexes = [
            models.Index(fields=['student', 'subject_code']),
            models.Index(fields=['date']),
            models.Index(fields=['semester']),
        ]
        unique_together = ['student', 'subject_code', 'date']
    
    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.student.fullNameEnglish} - {self.subject_name} ({self.date}) - {status}"
