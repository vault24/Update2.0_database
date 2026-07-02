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
    # NOTE: Only fullNameEnglish is strictly required at the DB level. Most
    # other fields are optional so that legacy/manual alumni (graduated before
    # this system existed) can be recorded with whatever data is available.
    fullNameBangla = models.CharField(max_length=255, blank=True)
    fullNameEnglish = models.CharField(max_length=255)
    fatherName = models.CharField(max_length=255, blank=True)
    fatherNID = models.CharField(max_length=20, blank=True)
    motherName = models.CharField(max_length=255, blank=True)
    motherNID = models.CharField(max_length=20, blank=True)
    dateOfBirth = models.DateField(null=True, blank=True)
    birthCertificateNo = models.CharField(max_length=50, blank=True)
    nidNumber = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    religion = models.CharField(max_length=50, blank=True)
    bloodGroup = models.CharField(max_length=5, blank=True)
    nationality = models.CharField(max_length=100, default='Bangladeshi', blank=True)
    maritalStatus = models.CharField(max_length=20, blank=True)
    
    # Contact Information
    mobileStudent = models.CharField(max_length=11, blank=True)
    guardianMobile = models.CharField(max_length=11, blank=True)
    email = models.EmailField(blank=True)
    emergencyContact = models.CharField(max_length=255, blank=True)
    presentAddress = models.JSONField(default=dict, blank=True)  # Structured address
    permanentAddress = models.JSONField(default=dict, blank=True)  # Structured address

    # Educational Background
    highestExam = models.CharField(max_length=100, blank=True)
    board = models.CharField(max_length=100, blank=True)
    group = models.CharField(max_length=50, blank=True)
    rollNumber = models.CharField(max_length=50, blank=True)
    registrationNumber = models.CharField(max_length=50, blank=True)
    passingYear = models.IntegerField(null=True, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    institutionName = models.CharField(max_length=255, blank=True)
    
    # Current Academic Information
    currentRollNumber = models.CharField(max_length=50, unique=True)
    currentRegistrationNumber = models.CharField(max_length=50, unique=True)
    semester = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT)
    session = models.CharField(max_length=20, blank=True)
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, blank=True)
    currentGroup = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    enrollmentDate = models.DateField(null=True, blank=True)
    
    # Academic Records (stored as JSON)
    semesterResults = models.JSONField(default=list, blank=True)
    semesterAttendance = models.JSONField(default=list, blank=True)

    # Final CGPA — the single cumulative GPA for the whole course. Semester
    # entries in semesterResults carry only their own GPA.
    finalCgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
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
        """Check if student has completed 8th semester"""
        if not self.semesterResults:
            return False
        
        # Check if 8th semester exists with a valid result
        for result in self.semesterResults:
            if result.get('semester') == 8:
                # Check if it's a GPA result with a valid GPA
                if result.get('resultType') == 'gpa' and result.get('gpa') and result.get('gpa') > 0:
                    return True
                # Or if it's any other valid result type
                elif result.get('resultType') and result.get('resultType') != 'gpa':
                    return True
        
        return False
    
    def get_highest_completed_semester(self):
        """Get the highest semester that has been completed with results"""
        if not self.semesterResults:
            return 0
        
        completed_semesters = []
        for result in self.semesterResults:
            semester = result.get('semester')
            if semester:
                # Check if it's a valid result (has GPA or is not failed)
                if result.get('resultType') == 'gpa' and result.get('gpa') and result.get('gpa') > 0:
                    completed_semesters.append(semester)
                elif result.get('resultType') == 'referred' and result.get('referredSubjects'):
                    # Even referred results count as completed semester (student can progress)
                    completed_semesters.append(semester)
                elif result.get('resultType') and result.get('resultType') not in ['gpa', 'referred']:
                    # Other result types (pass/fail, etc.)
                    completed_semesters.append(semester)
        
        return max(completed_semesters) if completed_semesters else 0
    
    def update_current_semester(self):
        """Update current semester based on completed semester results.

        Result entry only ever *raises* the semester — students promoted
        manually (bulk promotion without published results) must never be
        demoted when an older semester's result is entered later.
        """
        highest_completed = self.get_highest_completed_semester()

        # If student has completed results, current semester should be next semester
        # unless they've already completed 8th semester
        if highest_completed > 0:
            if highest_completed >= 8:
                # Student has completed all semesters, set to 8th semester
                # Note: Status should NOT be automatically changed to 'graduated'
                # Admin must manually transition student to alumni using the transition endpoint
                new_semester = 8
            else:
                # Student should be in the next semester
                new_semester = highest_completed + 1
                # Ensure we don't go beyond 8th semester
                new_semester = min(new_semester, 8)

            # Only ever promote — never demote below the current semester.
            if new_semester > self.semester:
                self.semester = new_semester
                return True

        return False
