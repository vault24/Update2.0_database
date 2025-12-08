"""
Student Models
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Student(models.Model):
    """
    Comprehensive Student model with all personal, contact, educational, and academic information
    """
    # Status choices
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('graduated', 'Graduated'),
        ('discontinued', 'Discontinued'),
    ]
    
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    
    SHIFT_CHOICES = [
        ('Morning', 'Morning'),
        ('Day', 'Day'),
        ('Evening', 'Evening'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Personal Information
    fullNameBangla = models.CharField(max_length=255)
    fullNameEnglish = models.CharField(max_length=255)
    fatherName = models.CharField(max_length=255)
    fatherNID = models.CharField(max_length=20)
    motherName = models.CharField(max_length=255)
    motherNID = models.CharField(max_length=20)
    dateOfBirth = models.DateField()
    birthCertificateNo = models.CharField(max_length=50)
    nidNumber = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    religion = models.CharField(max_length=50, blank=True)
    bloodGroup = models.CharField(max_length=5, blank=True)
    maritalStatus = models.CharField(max_length=20, blank=True)
    
    # Contact Information
    mobileStudent = models.CharField(max_length=11)
    guardianMobile = models.CharField(max_length=11)
    email = models.EmailField(blank=True)
    emergencyContact = models.CharField(max_length=255)
    presentAddress = models.JSONField()  # Structured address
    permanentAddress = models.JSONField()  # Structured address
    
    # Educational Background
    highestExam = models.CharField(max_length=100)
    board = models.CharField(max_length=100)
    group = models.CharField(max_length=50)
    rollNumber = models.CharField(max_length=50)
    registrationNumber = models.CharField(max_length=50)
    passingYear = models.IntegerField()
    gpa = models.DecimalField(max_digits=4, decimal_places=2)
    institutionName = models.CharField(max_length=255, blank=True)
    
    # Current Academic Information
    currentRollNumber = models.CharField(max_length=50, unique=True)
    currentRegistrationNumber = models.CharField(max_length=50, unique=True)
    semester = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT)
    session = models.CharField(max_length=20)
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    currentGroup = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    enrollmentDate = models.DateField()
    
    # Academic Records (stored as JSON)
    semesterResults = models.JSONField(default=list, blank=True)
    semesterAttendance = models.JSONField(default=list, blank=True)
    
    # Discontinued Student Fields
    discontinuedReason = models.TextField(blank=True)
    lastSemester = models.IntegerField(null=True, blank=True)
    
    # Media (stores relative path to client/assets/images/)
    profilePhoto = models.CharField(max_length=500, blank=True)
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'students'
        ordering = ['-createdAt']
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        indexes = [
            models.Index(fields=['currentRollNumber']),
            models.Index(fields=['currentRegistrationNumber']),
            models.Index(fields=['status']),
            models.Index(fields=['department', 'semester']),
        ]
    
    def __str__(self):
        return f"{self.fullNameEnglish} ({self.currentRollNumber})"
    
    def has_completed_eighth_semester(self):
        """Check if student has completed all 8 semesters"""
        if not self.semesterResults:
            return False
        
        semesters = [result.get('semester') for result in self.semesterResults]
        
        # Check if 8th semester exists and all previous semesters exist
        if 8 not in semesters:
            return False
        
        for i in range(1, 8):
            if i not in semesters:
                return False
        
        return True
