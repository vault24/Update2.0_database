"""
System Reports — centralized store for automatically-captured and manually
recorded system events: errors, exceptions, security changes, performance
issues, maintenance logs, and more.

Reports are GROUPED by fingerprint: the same error occurring repeatedly is a
single row whose occurrence_count / last_seen advance, instead of thousands of
duplicate rows.
"""
import uuid

from django.db import models


class SystemReport(models.Model):
    CATEGORY_CHOICES = [
        ('bug', 'System Bug'),
        ('runtime_error', 'Runtime Error'),
        ('exception', 'Application Exception'),
        ('server_error', 'Server Error'),
        ('database_error', 'Database Error'),
        ('api_error', 'API Error'),
        ('background_job', 'Background Job Failure'),
        ('scheduled_task', 'Scheduled Task Failure'),
        ('email_failure', 'Email Delivery Failure'),
        ('file_storage', 'File Upload / Storage Error'),
        ('auth_failure', 'Authentication & Authorization'),
        ('performance', 'Performance Issue'),
        ('resource_alert', 'High Memory / CPU Alert'),
        ('slow_query', 'Slow Database Query'),
        ('network', 'Network Connectivity'),
        ('downtime', 'Service Downtime'),
        ('outage', 'System Outage'),
        ('maintenance', 'Maintenance Log'),
        ('security_alert', 'Security Alert'),
        ('audit', 'Audit Log'),
        ('crash', 'Crash Report'),
    ]

    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
        ('info', 'Info'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
    ]

    SOURCE_CHOICES = [
        ('auto_middleware', 'Auto: Request Middleware'),
        ('auto_logging', 'Auto: Error Logging'),
        ('auto_signal', 'Auto: System Signal'),
        ('health_monitor', 'Auto: Health Monitor'),
        ('manual', 'Manual Entry'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='exception')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='auto_middleware')

    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    exception_type = models.CharField(max_length=255, blank=True)
    stack_trace = models.TextField(blank=True)

    # Request context (when the report originates from an HTTP request)
    path = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Who triggered it (best-effort; kept as text too in case the user is deleted)
    user = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='system_reports',
    )
    user_display = models.CharField(max_length=150, blank=True)

    # Arbitrary structured details (query time, thresholds, changed fields…)
    extra = models.JSONField(default=dict, blank=True)

    # Grouping / de-duplication
    fingerprint = models.CharField(max_length=64, unique=True, db_index=True)
    occurrence_count = models.PositiveIntegerField(default=1)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now_add=True)

    # Workflow
    assigned_to = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_system_reports',
    )
    resolved_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_system_reports',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_reports'
        ordering = ['-last_seen']
        verbose_name = 'System Report'
        verbose_name_plural = 'System Reports'
        indexes = [
            models.Index(fields=['category', '-last_seen']),
            models.Index(fields=['severity', '-last_seen']),
            models.Index(fields=['status', '-last_seen']),
            models.Index(fields=['-last_seen']),
        ]

    def __str__(self):
        return f"[{self.get_severity_display()}] {self.title} (x{self.occurrence_count})"
