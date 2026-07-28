"""
Alumni Models
"""
from django.db import models
from django.utils import timezone


def exclude_student_prefill(queryset):
    """Drop career-prefill rows of current students from an Alumni queryset.

    A 'student_prefill' row only stores Career Journey / Skills / Courses /
    Highlights that a current student filled in from their profile — the
    student is NOT an alumnus. Every listing, count, detection or targeting
    of alumni must go through this helper.
    """
    return queryset.exclude(registrationSource='student_prefill')


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

    # How this alumni record entered the system
    REGISTRATION_SOURCE_CHOICES = [
        ('pipeline', 'Promoted From Student'),      # 8th-semester transition
        ('admin_manual', 'Manually Added By Admin'),  # legacy graduate, admin entry
        ('self_registration', 'Self Registered'),    # alumni signed up themselves
        # Career-data holder for a CURRENT student (not an alumnus yet). Created
        # when a student fills Career Journey / Skills / Courses / Highlights
        # from their main profile; upgraded to 'pipeline' at graduation so the
        # data carries over. Rows with this source must never be treated as
        # alumni anywhere — use exclude_student_prefill() on alumni querysets.
        ('student_prefill', 'Student Pre-fill (Not Alumni)'),
    ]

    # Review state (only meaningful for self_registration, which needs admin approval)
    REVIEW_STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
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
    graduationYear = models.IntegerField(null=True, blank=True)

    # Registration / review workflow
    registrationSource = models.CharField(
        max_length=20,
        choices=REGISTRATION_SOURCE_CHOICES,
        default='pipeline'
    )
    reviewStatus = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS_CHOICES,
        default='approved'
    )
    
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
    
    # Extended profile information
    bio = models.TextField(blank=True, null=True)
    linkedinUrl = models.URLField(blank=True, null=True)
    portfolioUrl = models.URLField(blank=True, null=True)
    coverImage = models.URLField(blank=True, null=True)
    
    # Skills and highlights (stored as JSON)
    skills = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    courses = models.JSONField(default=list, blank=True)
    
    # Verification status
    isVerified = models.BooleanField(default=True)
    lastEditedAt = models.DateTimeField(null=True, blank=True)
    lastEditedBy = models.CharField(max_length=20, default='admin')  # 'student' or 'admin'
    verificationNotes = models.TextField(blank=True, null=True)
    
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
            models.Index(fields=['registrationSource']),
            models.Index(fields=['reviewStatus']),
        ]
    
    def __str__(self):
        return f"Alumni: {self.student.fullNameEnglish} ({self.graduationYear})"
    
    def sort_career_history(self):
        """
        Order career entries so the MOST RECENTLY ADDED one is always first.

        Sorting purely by startDate put a newly added entry below older ones
        whenever it started earlier (or on the same date), which is the opposite
        of what the student expects right after adding it.

        Keyed ONLY on `addedAt`, and the sort is stable, so entries sharing a
        stamp (two saves inside the same microsecond, or legacy rows with no
        stamp at all) keep the relative order they already have — which is why
        `add_career_position` puts the new entry at the front first.
        """
        if not self.careerHistory:
            return
        self.careerHistory.sort(key=lambda c: c.get('addedAt') or '', reverse=True)

    def recompute_current_position(self):
        """
        `currentPosition` = the role the alumnus actually holds now.

        Derived from the DATA, never from the list order: careerHistory is
        displayed newest-ADDED first, so reading index 0 would make whatever
        was saved last the "current" job even when it started years earlier.
        A role explicitly flagged isCurrent wins; otherwise the latest
        startDate does.
        """
        entries = [c for c in (self.careerHistory or []) if isinstance(c, dict)]
        if not entries:
            self.currentPosition = None
            return
        ongoing = [c for c in entries if c.get('isCurrent')]
        pool = ongoing or entries
        self.currentPosition = max(pool, key=lambda c: c.get('startDate') or '')

    def add_career_position(self, position_data):
        """
        Add a new career position to career history.
        The new entry becomes the first item (see sort_career_history).

        Args:
            position_data: dict with keys: organizationName, positionTitle,
                startDate, endDate (optional), isCurrent, ...
        """
        import uuid
        from django.utils import timezone

        if not self.careerHistory:
            self.careerHistory = []

        # Generate unique ID for the career position
        position_data['id'] = str(uuid.uuid4())
        # Insertion stamp — drives "newest first" ordering.
        position_data['addedAt'] = timezone.now().isoformat()

        # Front-insert, then stable-sort: the new entry stays first even if it
        # shares an `addedAt` stamp with the previous one.
        self.careerHistory.insert(0, position_data)
        self.sort_career_history()
        self.recompute_current_position()

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
    
    def add_skill(self, skill_data):
        """
        Add a new skill to the skills list
        
        Args:
            skill_data: dict with keys: name, category, proficiency
        """
        if not self.skills:
            self.skills = []
        
        # Generate ID for the skill
        skill_id = str(len(self.skills) + 1)
        skill_data['id'] = skill_id
        
        self.skills.append(skill_data)
        self.save()
        return skill_id
    
    def update_skill(self, skill_id, skill_data):
        """
        Update an existing skill
        
        Args:
            skill_id: ID of the skill to update
            skill_data: dict with updated skill information
        """
        if not self.skills:
            return False
        
        for i, skill in enumerate(self.skills):
            if skill.get('id') == skill_id:
                skill_data['id'] = skill_id
                self.skills[i] = skill_data
                self.save()
                return True
        return False
    
    def delete_skill(self, skill_id):
        """
        Delete a skill by ID
        
        Args:
            skill_id: ID of the skill to delete
        """
        if not self.skills:
            return False
        
        self.skills = [skill for skill in self.skills if skill.get('id') != skill_id]
        self.save()
        return True
    
    def add_highlight(self, highlight_data):
        """
        Add a new career highlight
        
        Args:
            highlight_data: dict with keys: title, description, date, type
        """
        if not self.highlights:
            self.highlights = []
        
        # Generate ID for the highlight
        highlight_id = str(len(self.highlights) + 1)
        highlight_data['id'] = highlight_id
        
        self.highlights.append(highlight_data)
        self.save()
        return highlight_id
    
    def update_highlight(self, highlight_id, highlight_data):
        """
        Update an existing career highlight
        
        Args:
            highlight_id: ID of the highlight to update
            highlight_data: dict with updated highlight information
        """
        if not self.highlights:
            return False
        
        for i, highlight in enumerate(self.highlights):
            if highlight.get('id') == highlight_id:
                highlight_data['id'] = highlight_id
                self.highlights[i] = highlight_data
                self.save()
                return True
        return False
    
    def delete_highlight(self, highlight_id):
        """
        Delete a career highlight by ID
        
        Args:
            highlight_id: ID of the highlight to delete
        """
        if not self.highlights:
            return False
        
        self.highlights = [highlight for highlight in self.highlights if highlight.get('id') != highlight_id]
        self.save()
        return True
    
    def update_career_position(self, career_id, career_data):
        """
        Update an existing career position
        
        Args:
            career_id: ID of the career position to update
            career_data: dict with updated career information
        """
        if not self.careerHistory:
            return False
        
        for i, career in enumerate(self.careerHistory):
            if career.get('id') == career_id:
                career_data['id'] = career_id
                # Editing must not move the entry: keep its original insertion
                # stamp so the list order stays stable.
                career_data['addedAt'] = career.get('addedAt') or career_data.get('addedAt') or ''
                self.careerHistory[i] = career_data
                self.sort_career_history()
                self.recompute_current_position()
                self.save()
                return True
        return False
    
    def delete_career_position(self, career_id):
        """
        Delete a career position by ID
        
        Args:
            career_id: ID of the career position to delete
        """
        if not self.careerHistory:
            return False
        
        self.careerHistory = [career for career in self.careerHistory if career.get('id') != career_id]
        # Otherwise a deleted role could stay pinned as the current position.
        self.recompute_current_position()
        self.save()
        return True
    
    def add_course(self, course_data):
        """
        Add a new course/certification
        
        Args:
            course_data: dict with keys: name, provider, status, completionDate, certificateId, certificateUrl, description
        """
        if not self.courses:
            self.courses = []
        
        # Generate ID for the course
        course_id = str(len(self.courses) + 1)
        course_data['id'] = course_id
        
        self.courses.append(course_data)
        self.save()
        return course_id
    
    def update_course(self, course_id, course_data):
        """
        Update an existing course/certification
        
        Args:
            course_id: ID of the course to update
            course_data: dict with updated course information
        """
        if not self.courses:
            return False
        
        for i, course in enumerate(self.courses):
            if course.get('id') == course_id:
                course_data['id'] = course_id
                self.courses[i] = course_data
                self.save()
                return True
        return False
    
    def delete_course(self, course_id):
        """
        Delete a course/certification by ID
        
        Args:
            course_id: ID of the course to delete
        """
        if not self.courses:
            return False
        
        self.courses = [course for course in self.courses if course.get('id') != course_id]
        self.save()
        return True
    
    def mark_as_unverified(self, edited_by='student'):
        """
        Mark the alumni profile as unverified after student edits
        
        Args:
            edited_by: Who made the edit ('student' or 'admin')
        """
        if edited_by == 'student':
            self.isVerified = False
            self.lastEditedAt = timezone.now()
            self.lastEditedBy = 'student'
            self.save()
    
    def verify_profile(self, notes=''):
        """
        Mark the alumni profile as verified by admin
        
        Args:
            notes: Optional verification notes
        """
        self.isVerified = True
        self.lastEditedBy = 'admin'
        self.verificationNotes = notes
        self.save()
