"""
Teacher Models
"""
from django.db import models
import uuid


class Teacher(models.Model):
    """
    Teacher model representing faculty members
    """
    # Status choices
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on_leave', 'On Leave'),
        ('retired', 'Retired'),
    ]
    
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Personal Information
    fullNameBangla = models.CharField(max_length=255)
    fullNameEnglish = models.CharField(max_length=255)
    designation = models.CharField(max_length=100)
    
    # Department and Academic Info
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT, related_name='teachers')
    subjects = models.JSONField(default=list)  # List of subject names
    qualifications = models.JSONField(default=list)  # List of qualification objects
    specializations = models.JSONField(default=list)  # List of specialization strings
    shifts = models.JSONField(default=list)  # List of assigned shifts: ['morning', 'day']
    
    # Contact Information
    email = models.EmailField(unique=True)
    mobileNumber = models.CharField(max_length=11)
    officeLocation = models.CharField(max_length=255)
    
    # Employment Information
    employmentStatus = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    joiningDate = models.DateField()
    
    # Media
    profilePhoto = models.CharField(max_length=500, blank=True)
    coverPhoto = models.CharField(max_length=500, blank=True)
    
    # Profile Information (LinkedIn-style)
    headline = models.CharField(max_length=500, blank=True)
    about = models.TextField(blank=True)
    skills = models.JSONField(default=list)  # List of skill strings
    
    # User reference
    user = models.OneToOneField('authentication.User', on_delete=models.CASCADE, null=True, blank=True, related_name='teacher_profile')
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teachers'
        ordering = ['fullNameEnglish']
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['employmentStatus']),
            models.Index(fields=['department']),
        ]
    
    def __str__(self):
        return f"{self.fullNameEnglish} - {self.designation}"


class TeacherExperience(models.Model):
    """
    Work experience for teachers
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='experiences')
    title = models.CharField(max_length=200)
    institution = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    startDate = models.CharField(max_length=50)
    endDate = models.CharField(max_length=50, blank=True)
    current = models.BooleanField(default=False)
    description = models.TextField()
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teacher_experiences'
        ordering = ['order', '-startDate']
        verbose_name = 'Teacher Experience'
        verbose_name_plural = 'Teacher Experiences'
    
    def __str__(self):
        return f"{self.teacher.fullNameEnglish} - {self.title} at {self.institution}"


class TeacherEducation(models.Model):
    """
    Educational qualifications for teachers
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='education')
    degree = models.CharField(max_length=200)
    institution = models.CharField(max_length=200)
    year = models.CharField(max_length=10)
    field = models.CharField(max_length=200)
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teacher_education'
        ordering = ['order', '-year']
        verbose_name = 'Teacher Education'
        verbose_name_plural = 'Teacher Education'
    
    def __str__(self):
        return f"{self.teacher.fullNameEnglish} - {self.degree}"


class TeacherPublication(models.Model):
    """
    Research publications for teachers
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='publications')
    title = models.CharField(max_length=500)
    journal = models.CharField(max_length=200)
    year = models.CharField(max_length=10)
    citations = models.IntegerField(default=0)
    link = models.URLField(blank=True)
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teacher_publications'
        ordering = ['order', '-year']
        verbose_name = 'Teacher Publication'
        verbose_name_plural = 'Teacher Publications'
    
    def __str__(self):
        return f"{self.teacher.fullNameEnglish} - {self.title}"


class TeacherResearch(models.Model):
    """
    Research projects for teachers
    """
    STATUS_CHOICES = [
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='research')
    title = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ongoing')
    year = models.CharField(max_length=50)
    description = models.TextField()
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teacher_research'
        ordering = ['order', '-year']
        verbose_name = 'Teacher Research'
        verbose_name_plural = 'Teacher Research'
    
    def __str__(self):
        return f"{self.teacher.fullNameEnglish} - {self.title}"


class TeacherAward(models.Model):
    """
    Awards and honors for teachers
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='awards')
    title = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200)
    year = models.CharField(max_length=10)
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teacher_awards'
        ordering = ['order', '-year']
        verbose_name = 'Teacher Award'
        verbose_name_plural = 'Teacher Awards'
    
    def __str__(self):
        return f"{self.teacher.fullNameEnglish} - {self.title}"
