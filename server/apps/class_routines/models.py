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
        """Validate that end_time is after start_time and check for conflicts"""
        from django.core.exceptions import ValidationError
        from django.db.models import Q
        
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError('End time must be after start time')
        
        # Check for schedule conflicts if we have the required fields
        if all([self.day_of_week, self.start_time, self.end_time, self.is_active]):
            self._validate_schedule_conflicts()
    
    def _check_time_overlap(self, start_time1, end_time1, start_time2, end_time2):
        """Check if two time periods overlap"""
        return start_time1 < end_time2 and start_time2 < end_time1
    
    def _validate_schedule_conflicts(self):
        """Validate that the schedule doesn't conflict with existing routines"""
        from django.core.exceptions import ValidationError
        from django.db.models import Q
        
        # Build base query for existing routines on the same day
        base_query = Q(
            day_of_week=self.day_of_week,
            is_active=True
        )
        
        # Exclude current instance if updating
        if self.pk:
            base_query &= ~Q(id=self.pk)
        
        existing_routines = ClassRoutine.objects.filter(base_query)
        
        conflicts = []
        
        for routine in existing_routines:
            # Check if times overlap
            if self._check_time_overlap(self.start_time, self.end_time, routine.start_time, routine.end_time):
                
                # Check room conflict
                if self.room_number and routine.room_number == self.room_number:
                    conflicts.append(f'Room {self.room_number} is already booked on {self.day_of_week} from {routine.start_time} to {routine.end_time} for {routine.subject_name}')
                
                # Check teacher conflict
                if self.teacher_id and routine.teacher_id == self.teacher_id:
                    teacher_name = self.teacher.name if self.teacher else 'this teacher'
                    conflicts.append(f'{teacher_name} is already assigned on {self.day_of_week} from {routine.start_time} to {routine.end_time} for {routine.subject_name}')
                
                # Check class conflict (same department, semester, shift)
                if (self.department_id and self.semester and self.shift and 
                    routine.department_id == self.department_id and 
                    routine.semester == self.semester and 
                    routine.shift == self.shift):
                    conflicts.append(f'Students of {self.department.name} Semester {self.semester} ({self.shift}) already have {routine.subject_name} on {self.day_of_week} from {routine.start_time} to {routine.end_time}')
        
        if conflicts:
            raise ValidationError({
                'schedule_conflicts': conflicts
            })
