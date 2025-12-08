"""
Class Routine Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ClassRoutine(models.Model):
    """
    Class routine/schedule model for managing class timetables
    """
    # Day choices
    DAY_CHOICES = [
        ('Sunday', 'Sunday'),
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
    ]
    
    # Shift choices
    SHIFT_CHOICES = [
        ('Morning', 'Morning'),
        ('Day', 'Day'),
        ('Evening', 'Evening'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Academic Information
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.CASCADE,
        related_name='class_routines'
    )
    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(8)]
    )
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    session = models.CharField(max_length=20)
    
    # Schedule Information
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    # Subject Information
    subject_name = models.CharField(max_length=255)
    subject_code = models.CharField(max_length=50)
    
    # Teacher Assignment
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_routines'
    )
    
    # Location
    room_number = models.CharField(max_length=50)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'class_routines'
        ordering = ['day_of_week', 'start_time']
        verbose_name = 'Class Routine'
        verbose_name_plural = 'Class Routines'
        indexes = [
            models.Index(fields=['department', 'semester', 'shift']),
            models.Index(fields=['teacher']),
            models.Index(fields=['day_of_week', 'start_time']),
        ]
    
    def __str__(self):
        return f"{self.subject_name} - {self.day_of_week} {self.start_time}"
    
    def clean(self):
        """Validate that end_time is after start_time"""
        from django.core.exceptions import ValidationError
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError('End time must be after start time')
