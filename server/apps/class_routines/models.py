"""
Class Routine Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class SemesterArchive(models.Model):
    """
    One row per "Update Semester" event performed by an administrator.

    ARCHIVE, DON'T DELETE. A semester rollover never removes or moves data:
    every ClassRoutine / AttendanceRecord / MarksRecord that belonged to the
    outgoing semester is simply STAMPED with a FK to this row. From then on:

        archive IS NULL  ->  the CURRENT semester workspace (editable)
        archive = <row>  ->  historical, read-only, shown on Teacher History

    That keeps the records physically in place (no data migration, no loss,
    fully traceable) while cleanly separating the new semester's workspace.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Human label shown in the History page selector, e.g. "2024-25 (archived 28 Jul 2026)".
    label = models.CharField(max_length=255)
    # Dominant session of the archived routines, when it can be determined.
    session = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    archived_at = models.DateTimeField(auto_now_add=True)
    archived_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='semester_archives',
    )

    # Snapshot counts so the History UI can summarise without re-aggregating.
    routines_count = models.IntegerField(default=0)
    attendance_count = models.IntegerField(default=0)
    marks_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'semester_archives'
        ordering = ['-archived_at']
        verbose_name = 'Semester Archive'
        verbose_name_plural = 'Semester Archives'

    def __str__(self):
        return self.label


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

    # Class Type Information
    CLASS_TYPE_CHOICES = [
        ('Theory', 'Theory'),
        ('Lab', 'Lab'),
    ]
    class_type = models.CharField(
        max_length=10,
        choices=CLASS_TYPE_CHOICES,
        default='Theory'
    )
    lab_name = models.CharField(max_length=255, null=True, blank=True)
    
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

    # Semester archive (see SemesterArchive). NULL = current semester.
    archive = models.ForeignKey(
        'class_routines.SemesterArchive',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_index=True,
        related_name='routines',
    )

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
            models.Index(fields=['archive']),
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
