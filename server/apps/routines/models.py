"""
BTEB Exam Routine models.

The routine module is a *consumer* of the existing academic data platform:
it stores only the exam schedule (which subject code sits on which date at
which time), and joins against the shared Subject catalog (apps.results
.Subject) and Result database (apps.results.StudentResult) to build each
student's personalized routine. It never stores curriculum/subject lists of
its own.

Design mirrors apps.results (RoutineImport ↔ ResultImport, RoutineParserIssue
↔ ParserIssue) so the two modules feel like one platform.
"""
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class RoutineImport(models.Model):
    """One uploaded BTEB routine PDF and its import outcome."""

    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    # Which examination this routine schedules. Only 'final' is implemented;
    # 'mid' is reserved so the student page's Mid tab can light up later.
    EXAM_TYPE_CHOICES = [
        ('final', 'Semester Final'),
        ('mid', 'Mid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fileName = models.CharField(max_length=255)
    fileSha256 = models.CharField(max_length=64, unique=True)
    pageCount = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    examType = models.CharField(max_length=10, choices=EXAM_TYPE_CHOICES, default='final')

    # Exam identity / metadata parsed from the notice.
    regulationYear = models.IntegerField(null=True, blank=True)
    examSession = models.CharField(max_length=160, blank=True)  # e.g. "পরীক্ষা-২০২৫"
    memoNo = models.CharField(max_length=100, blank=True)
    publicationDate = models.DateField(null=True, blank=True)
    examStartDate = models.DateField(null=True, blank=True)
    examEndDate = models.DateField(null=True, blank=True)

    # Only ONE routine per (examType, regulation) is "active" at a time — the
    # newest completed import. The generator reads the active one.
    isActive = models.BooleanField(default=False)

    stats = models.JSONField(default=dict, blank=True)
    errorMessage = models.TextField(blank=True)
    uploadedBy = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='routine_imports',
    )
    createdAt = models.DateTimeField(auto_now_add=True)
    completedAt = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'routine_imports'
        ordering = ['-createdAt']

    def __str__(self):
        return f"{self.fileName} ({self.status})"


class RoutineSession(models.Model):
    """One exam sitting: a date + time slot within a routine.

    ``weekday`` is DERIVED from the date at import time (the PDF's Bengali
    weekday text is font-mangled and unreliable). ``startTime`` is normalized
    to 24h; ``durationMinutes`` defaults to the standard theory length.
    """

    SECTION_CHOICES = [
        ('theory', 'Theory (written)'),
        ('practical', 'Practical'),
    ]
    SLOT_CHOICES = [
        ('morning', 'Morning'),
        ('afternoon', 'Afternoon'),
        ('other', 'Other'),
    ]

    routine = models.ForeignKey(
        RoutineImport, on_delete=models.CASCADE, related_name='sessions',
    )
    section = models.CharField(max_length=12, choices=SECTION_CHOICES, default='theory')
    examDate = models.DateField()
    # 0=Monday … 6=Sunday (Python's date.weekday()), derived from examDate.
    weekday = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(6)])
    slot = models.CharField(max_length=10, choices=SLOT_CHOICES, default='morning')
    startTime = models.TimeField()
    durationMinutes = models.IntegerField(default=180)
    # Raw pobo header, e.g. "৩য়/৫ম/৬ষ্ঠ পর্ব" — display/validation only.
    poboLabel = models.CharField(max_length=120, blank=True)
    regulationYear = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'routine_sessions'
        ordering = ['examDate', 'startTime']
        indexes = [models.Index(fields=['routine', 'examDate'])]

    def __str__(self):
        return f"{self.examDate} {self.startTime} ({self.section})"


class RoutineSubject(models.Model):
    """A subject code scheduled in a session. The subjectCode is the join key
    against the shared Subject catalog and student result data."""

    session = models.ForeignKey(
        RoutineSession, on_delete=models.CASCADE, related_name='subjects',
    )
    subjectCode = models.CharField(max_length=10)
    # Best-effort raw Bengali name from the PDF (display uses the catalog's
    # English name; this is a fallback / audit trail).
    rawName = models.CharField(max_length=255, blank=True)
    # Raw "technology: pobo" applicability string, e.g. "৫ম পর্ব: কম্পিউটার".
    techApplicability = models.TextField(blank=True)
    serial = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'routine_subjects'
        ordering = ['session', 'serial']
        indexes = [models.Index(fields=['subjectCode'])]

    def __str__(self):
        return f"{self.subjectCode} @ {self.session_id}"


class RoutineParserIssue(models.Model):
    """Diagnostics raised while parsing/validating a routine import."""

    SEVERITY_CHOICES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]

    routine = models.ForeignKey(
        RoutineImport, on_delete=models.CASCADE, related_name='issues',
    )
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    stage = models.CharField(max_length=30)
    code = models.CharField(max_length=50)
    message = models.TextField()
    context = models.TextField(blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'routine_parser_issues'
        ordering = ['severity', 'id']
        indexes = [models.Index(fields=['routine', 'severity'])]

    def __str__(self):
        return f"[{self.severity}] {self.code}"
