"""
Stipend Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class StipendCriteria(models.Model):
    """
    Configurable stipend eligibility criteria
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Criteria name (e.g., 'Semester 4 Stipend 2024')")
    description = models.TextField(blank=True)
    
    # Eligibility criteria
    minAttendance = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=75.0,
        help_text="Minimum attendance percentage required"
    )
    minGpa = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
        default=2.5,
        help_text="Minimum GPA required"
    )
    passRequirement = models.CharField(
        max_length=20,
        choices=[
            ('all_pass', 'All Subjects Pass'),
            ('1_referred', 'Max 1 Referred'),
            ('2_referred', 'Max 2 Referred'),
            ('any', 'Any (No Restriction)'),
        ],
        default='all_pass',
        help_text="Pass requirement for eligibility"
    )
    
    # Filters
    department = models.ForeignKey(
        'departments.Department', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="Specific department (leave blank for all)"
    )
    semester = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(8)],
        help_text="Specific semester (leave blank for all)"
    )
    shift = models.CharField(
        max_length=20,
        choices=[
            ('Morning', 'Morning'),
            ('Day', 'Day'),
            ('Evening', 'Evening'),
        ],
        null=True,
        blank=True,
        help_text="Specific shift (leave blank for all)"
    )
    session = models.CharField(
        max_length=20, 
        null=True, 
        blank=True,
        help_text="Specific session (leave blank for all)"
    )
    
    # Status
    isActive = models.BooleanField(default=True)
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    createdBy = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_stipend_criteria'
    )
    
    class Meta:
        db_table = 'stipend_criteria'
        ordering = ['-createdAt']
        verbose_name = 'Stipend Criteria'
        verbose_name_plural = 'Stipend Criteria'
    
    def __str__(self):
        return self.name


class StipendEligibility(models.Model):
    """
    Tracks stipend eligibility for students
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='stipend_eligibilities')
    criteria = models.ForeignKey(StipendCriteria, on_delete=models.CASCADE, related_name='eligible_students')
    
    # Eligibility data at the time of evaluation
    attendance = models.DecimalField(max_digits=5, decimal_places=2)
    gpa = models.DecimalField(max_digits=4, decimal_places=2)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    referredSubjects = models.IntegerField(default=0)
    totalSubjects = models.IntegerField(default=0)
    passedSubjects = models.IntegerField(default=0)
    
    # Ranking
    rank = models.IntegerField(null=True, blank=True)
    
    # Status
    isEligible = models.BooleanField(default=True)
    isApproved = models.BooleanField(default=False)
    approvedBy = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_stipends'
    )
    approvedAt = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stipend_eligibility'
        ordering = ['rank', '-gpa', '-attendance']
        verbose_name = 'Stipend Eligibility'
        verbose_name_plural = 'Stipend Eligibilities'
        unique_together = ['student', 'criteria']
    
    def __str__(self):
        return f"{self.student.fullNameEnglish} - {self.criteria.name}"
