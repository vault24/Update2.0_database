"""
Attendance Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class AttendanceRecord(models.Model):
    """
    Attendance record for tracking student attendance
    Supports both teacher direct entry and captain submission with teacher approval
    """
    # Status choices
    STATUS_CHOICES = [
        ('draft', 'Draft'),  # Captain is preparing
        ('pending', 'Pending Approval'),  # Captain submitted, awaiting teacher approval
        ('approved', 'Approved'),  # Teacher approved
        ('rejected', 'Rejected'),  # Teacher rejected
        ('direct', 'Direct Entry'),  # Teacher entered directly
    ]
    
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
    
    # Link to Class Routine (optional)
    class_routine = models.ForeignKey(
        'class_routines.ClassRoutine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_records'
    )
    
    # Attendance Information
    date = models.DateField()
    is_present = models.BooleanField(default=False)
    
    # Workflow Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='direct'
    )
    
    # Recorded By (Captain or Teacher)
    recorded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_attendance'
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    # Approval Information
    approved_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_attendance'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'attendance_records'
        ordering = ['-date', '-recorded_at']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        indexes = [
            models.Index(fields=['student', 'subject_code']),
            models.Index(fields=['date']),
            models.Index(fields=['semester']),
            models.Index(fields=['status']),
            models.Index(fields=['class_routine']),
        ]
        constraints = [
            # Primary uniqueness for routine-based attendance (teacher flow)
            models.UniqueConstraint(
                fields=['student', 'class_routine', 'date'],
                name='attendance_unique_student_routine_date'
            ),
            # Backward compatibility for legacy records without routine linkage
            models.UniqueConstraint(
                fields=['student', 'subject_code', 'date'],
                condition=models.Q(class_routine__isnull=True),
                name='attendance_unique_student_subject_date_no_routine'
            ),
        ]
    
    def __str__(self):
        status_str = "Present" if self.is_present else "Absent"
        return f"{self.student.fullNameEnglish} - {self.subject_name} ({self.date}) - {status_str} [{self.status}]"
