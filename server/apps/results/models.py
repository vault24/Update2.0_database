"""
BTEB Result Management models.

Stores results parsed from official BTEB result-notice PDFs. One PDF covers a
single exam event (semester + regulation + program) for every institute in the
country; we import all of it so any roll can be searched.

Design notes
------------
- A roll number is unique only *within* an exam: the same student appears in
  the 5th-semester PDF and again in the 8th-semester PDF. Search-by-roll
  therefore returns one StudentResult per exam, forming the student's history.
- Semester GPAs live in their own table (one row per semester) instead of
  gpa1..gpa8 columns so future regulations with a different semester count
  need no schema change.
- Referred / expelled / continuous-assessment subjects share one table with a
  ``role`` discriminator; the theory/practical flags map BTEB's ``(T)``,
  ``(P)`` and ``(T,P)`` suffixes.
"""
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Exam(models.Model):
    """One BTEB examination event, e.g. "5th Semester (2022 Regulation)
    Examination of DIPLOMA IN ENGINEERING, 2025 held in January-March, 2026".
    """

    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    regulationYear = models.IntegerField()
    # Kept verbatim from the notice ("DIPLOMA IN ENGINEERING", ...) so other
    # BTEB programs import without a schema change.
    program = models.CharField(max_length=120)
    # Verbatim exam-session text, e.g. "2025 held in January-March, 2026".
    # Part of the exam identity: a supplementary exam of the same semester
    # and regulation is a distinct event.
    heldIn = models.CharField(max_length=120)
    publicationDate = models.DateField(null=True, blank=True)
    memoNo = models.CharField(max_length=100, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'result_exams'
        unique_together = [('semester', 'regulationYear', 'program', 'heldIn')]
        ordering = ['-regulationYear', 'semester']

    def __str__(self):
        return (
            f"{self.semester} sem ({self.regulationYear} Regulation) "
            f"{self.program} — {self.heldIn}"
        )


class Institute(models.Model):
    """A BTEB institute as printed in the notice header, e.g.
    "57057 - Sherpur Polytechnic Institute, Sherpur".
    """

    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=255)

    class Meta:
        db_table = 'result_institutes'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class ResultImport(models.Model):
    """One PDF upload / import run, with its statistics and outcome.

    ``fileSha256`` is unique so the same official PDF cannot be imported
    twice by accident; re-importing replaces the previous run's data (see
    apps.results.importer).
    """

    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fileName = models.CharField(max_length=255)
    fileSha256 = models.CharField(max_length=64, unique=True)
    pageCount = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    # Aggregate parse/import statistics (record counts by type, institute
    # count, sync summary, timings). Shape documented in importer.py.
    stats = models.JSONField(default=dict, blank=True)
    errorMessage = models.TextField(blank=True)
    exam = models.ForeignKey(
        Exam, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='imports',
    )
    uploadedBy = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='result_imports',
    )
    createdAt = models.DateTimeField(auto_now_add=True)
    completedAt = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'result_imports'
        ordering = ['-createdAt']

    def __str__(self):
        return f"{self.fileName} ({self.status})"


class StudentResult(models.Model):
    """One student's outcome in one exam, as published in the notice."""

    RESULT_TYPE_CHOICES = [
        # Passed every subject. cgpa is set when the notice publishes it
        # (final-semester results).
        ('passed', 'Passed'),
        # Failed in a small number of subjects ("three or less") — GPA history
        # published with 'ref' placeholders, referred subjects listed.
        ('referred', 'Referred'),
        # Failed in many subjects ("four or more") — no GPA published, only
        # the failed/referred subject codes.
        ('failed', 'Failed'),
        # Expelled under a BTEB disciplinary rule. May carry an expelled
        # subject and referred subjects, or be published as a bare roll.
        ('expelled', 'Expelled'),
        # Failed the continuous-assessment (theory/practical) part.
        ('continuous_fail', 'Continuous Assessment Failed'),
    ]

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    institute = models.ForeignKey(
        Institute, on_delete=models.PROTECT, related_name='results',
    )
    importRecord = models.ForeignKey(
        ResultImport, on_delete=models.CASCADE, related_name='results',
    )
    rollNumber = models.CharField(max_length=20)
    resultType = models.CharField(max_length=20, choices=RESULT_TYPE_CHOICES)
    # Cumulative GPA — only published for final-semester passers.
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    # BTEB disciplinary rule reference for expelled students, e.g.
    # "Combined Disciplinary Rule 1.3", when the notice states one.
    expelledRule = models.CharField(max_length=100, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_results'
        unique_together = [('exam', 'rollNumber')]
        indexes = [
            models.Index(fields=['rollNumber']),
            models.Index(fields=['institute', 'exam']),
        ]

    def __str__(self):
        return f"{self.rollNumber} — {self.resultType} ({self.exam})"


class SemesterGPA(models.Model):
    """One semester's GPA inside a published GPA history.

    ``gpa`` is NULL with ``isReferred=True`` when the notice prints ``ref``
    for that semester (result withheld until referred subjects clear).
    """

    result = models.ForeignKey(
        StudentResult, on_delete=models.CASCADE, related_name='semesterGpas',
    )
    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    isReferred = models.BooleanField(default=False)

    class Meta:
        db_table = 'result_semester_gpas'
        unique_together = [('result', 'semester')]
        ordering = ['semester']

    def __str__(self):
        value = 'ref' if self.isReferred else self.gpa
        return f"{self.result.rollNumber} sem{self.semester}: {value}"


class ResultSubject(models.Model):
    """A subject code attached to a result (referred / expelled / CA-failed).

    ``hasTheory`` / ``hasPractical`` decode BTEB's ``(T)``, ``(P)``, ``(T,P)``
    suffixes. Expelled and continuous-assessment subject codes are printed
    without a suffix; both flags stay False in that case.
    """

    ROLE_CHOICES = [
        ('referred', 'Referred'),
        ('expelled', 'Expelled'),
        ('continuous_fail', 'Continuous Assessment Failed'),
    ]

    result = models.ForeignKey(
        StudentResult, on_delete=models.CASCADE, related_name='subjects',
    )
    subjectCode = models.CharField(max_length=10)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='referred')
    hasTheory = models.BooleanField(default=False)
    hasPractical = models.BooleanField(default=False)

    class Meta:
        db_table = 'result_subjects'
        ordering = ['subjectCode']

    def __str__(self):
        parts = [p for flag, p in ((self.hasTheory, 'T'), (self.hasPractical, 'P')) if flag]
        suffix = f"({','.join(parts)})" if parts else ''
        return f"{self.result.rollNumber} {self.subjectCode}{suffix} [{self.role}]"


class Subject(models.Model):
    """One subject from a BTEB Probidhan course-structure PDF.

    Imported from the official per-technology "Course Structure" documents
    (code, name, credit and the marks distribution). Referred subject codes
    on results resolve against this table so the portal can show the subject
    name, its semester and the full marks breakdown instead of a bare code.

    Codes are shared across technologies for common subjects (25911
    Mathematics-I appears in every technology with identical data), so the
    code is unique per regulation and the latest import wins.
    """

    code = models.CharField(max_length=10)
    name = models.CharField(max_length=255)
    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    regulationYear = models.IntegerField(null=True, blank=True)
    # e.g. "Computer Science & Technology" / its BTEB code "85".
    technology = models.CharField(max_length=255, blank=True)
    techCode = models.CharField(max_length=10, blank=True)

    credit = models.IntegerField(null=True, blank=True)
    theoryPeriods = models.IntegerField(null=True, blank=True)
    practicalPeriods = models.IntegerField(null=True, blank=True)

    # Marks distribution. "Continuous" = continuous assessment, "Final" =
    # final exam; totalMarks is the printed Grand Total.
    theoryContinuous = models.IntegerField(null=True, blank=True)
    theoryFinal = models.IntegerField(null=True, blank=True)
    theoryTotal = models.IntegerField(null=True, blank=True)
    practicalContinuous = models.IntegerField(null=True, blank=True)
    practicalFinal = models.IntegerField(null=True, blank=True)
    practicalTotal = models.IntegerField(null=True, blank=True)
    totalMarks = models.IntegerField(null=True, blank=True)

    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'result_subject_catalog'
        unique_together = [('code', 'regulationYear')]
        ordering = ['semester', 'code']
        indexes = [models.Index(fields=['code'])]

    def __str__(self):
        return f"{self.code} {self.name} (sem {self.semester})"


class ParserIssue(models.Model):
    """A diagnostic raised while parsing or validating an import.

    Everything the parser could not fully understand is recorded here instead
    of being silently dropped — the import screen surfaces these so an admin
    can judge whether the import is trustworthy.
    """

    SEVERITY_CHOICES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]

    importRecord = models.ForeignKey(
        ResultImport, on_delete=models.CASCADE, related_name='issues',
    )
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    # Pipeline stage that raised the issue (extract/classify/parse/validate/
    # import/sync) — helps triage without reading code.
    stage = models.CharField(max_length=30)
    # Stable machine code, e.g. 'residual-tokens', 'orphan-roll'.
    code = models.CharField(max_length=50)
    message = models.TextField()
    # Free-form context (offending snippet, institute code, page hint).
    context = models.TextField(blank=True)
    rollNumber = models.CharField(max_length=20, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'result_parser_issues'
        ordering = ['severity', 'id']
        indexes = [models.Index(fields=['importRecord', 'severity'])]

    def __str__(self):
        return f"[{self.severity}] {self.code}: {self.message[:60]}"
