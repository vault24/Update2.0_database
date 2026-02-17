"""
Department Models
"""
from django.db import models
import uuid


class Department(models.Model):
    """
    Department model representing academic departments/programs
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=10, unique=True)
    head = models.CharField(max_length=255, blank=True, null=True)
    established_year = models.CharField(max_length=4, blank=True, null=True)
    photo = models.ImageField(upload_to='departments/', blank=True, null=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return f"{self.name} ({self.code})"

    def student_count(self):
        """Return the number of students in this department"""
        return self.student_set.count()
    
    def teacher_count(self):
        """Return the number of teachers in this department"""
        return self.teacher_set.count()
