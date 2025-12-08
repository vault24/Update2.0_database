"""
Alumni Models
"""
from django.db import models
from django.utils import timezone


class Alumni(models.Model):
    """
    Alumni model for tracking graduated students
    """
    # Alumni type choices
    ALUMNI_TYPE_CHOICES = [
        ('recent', 'Recent Graduate'),
        ('established', 'Established Professional'),
    ]
    
    # Support category choices
    SUPPORT_CATEGORY_CHOICES = [
        ('receiving_support', 'Receiving Support'),
        ('needs_extra_support', 'Needs Extra Support'),
        ('no_support_needed', 'No Support Needed'),
    ]
    
    # One-to-one relationship with Student
    student = models.OneToOneField(
        'students.Student',
        on_delete=models.PROTECT,
        related_name='alumni',
        primary_key=True
    )
    
    # Alumni information
    alumniType = models.CharField(
        max_length=20,
        choices=ALUMNI_TYPE_CHOICES,
        default='recent'
    )
    transitionDate = models.DateTimeField(default=timezone.now)
    graduationYear = models.IntegerField()
    
    # Support tracking
    currentSupportCategory = models.CharField(
        max_length=30,
        choices=SUPPORT_CATEGORY_CHOICES,
        default='no_support_needed'
    )
    
    # Career information (stored as JSON)
    currentPosition = models.JSONField(null=True, blank=True)
    careerHistory = models.JSONField(default=list, blank=True)
    supportHistory = models.JSONField(default=list, blank=True)
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'alumni'
        ordering = ['-transitionDate']
        verbose_name = 'Alumni'
        verbose_name_plural = 'Alumni'
        indexes = [
            models.Index(fields=['alumniType']),
            models.Index(fields=['graduationYear']),
            models.Index(fields=['currentSupportCategory']),
        ]
    
    def __str__(self):
        return f"Alumni: {self.student.fullNameEnglish} ({self.graduationYear})"
    
    def add_career_position(self, position_data):
        """
        Add a new career position to career history
        Positions are sorted by startDate in descending order (most recent first)
        
        Args:
            position_data: dict with keys: company, position, startDate, endDate (optional)
        """
        if not self.careerHistory:
            self.careerHistory = []
        
        # Add the new position
        self.careerHistory.append(position_data)
        
        # Sort by startDate in descending order (most recent first)
        self.careerHistory.sort(
            key=lambda x: x.get('startDate', ''),
            reverse=True
        )
        
        # Update current position if this is the most recent
        if position_data.get('startDate') == self.careerHistory[0].get('startDate'):
            self.currentPosition = position_data
        
        self.save()
    
    def update_support_category(self, new_category, notes=''):
        """
        Update support category and add entry to support history
        
        Args:
            new_category: New support category value
            notes: Optional notes about the change
        """
        if not self.supportHistory:
            self.supportHistory = []
        
        # Add history entry
        history_entry = {
            'date': timezone.now().isoformat(),
            'previousCategory': self.currentSupportCategory,
            'newCategory': new_category,
            'notes': notes
        }
        self.supportHistory.append(history_entry)
        
        # Update current category
        self.currentSupportCategory = new_category
        self.save()
