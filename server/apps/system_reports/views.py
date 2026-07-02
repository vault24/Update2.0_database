"""
System Reports API (admin-only).

  GET    /api/system-reports/                 list (filters: category, severity,
                                              status, source, search, date_from,
                                              date_to, ordering) — paginated
  POST   /api/system-reports/                 manual entry (maintenance, outage…)
  GET    /api/system-reports/{id}/            full detail (stack trace, extra)
  PATCH  /api/system-reports/{id}/            update status/severity/assignment/note
  POST   /api/system-reports/{id}/action/     {action: resolve|ignore|investigate|reopen, note?, assigned_to?}
  POST   /api/system-reports/bulk-action/     {ids: [...], action: ...}
  GET    /api/system-reports/stats/           dashboard summary + 14-day trend
  GET    /api/system-reports/timeline/        recent significant events
  GET    /api/system-reports/health/          live system health snapshot
  GET    /api/system-reports/export/          CSV export honouring filters
"""
import csv

from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from datetime import timedelta

from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from .models import SystemReport
from .serializers import (
    SystemReportListSerializer,
    SystemReportDetailSerializer,
    SystemReportCreateSerializer,
)


class IsAdminPortalUser(BasePermission):
    """Only admin-side roles may access system reports."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin())


VALID_ORDERINGS = {
    'last_seen', '-last_seen', 'first_seen', '-first_seen',
    'occurrence_count', '-occurrence_count', 'severity', '-severity',
    'title', '-title',
}

_SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']


class SystemReportViewSet(viewsets.ModelViewSet):
    queryset = SystemReport.objects.select_related('assigned_to', 'resolved_by')
    permission_classes = [IsAuthenticated, IsAdminPortalUser]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_serializer_class(self):
        if self.action == 'list':
            return SystemReportListSerializer
        if self.action == 'create':
            return SystemReportCreateSerializer
        return SystemReportDetailSerializer

    # ------------------------------------------------------------------
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        category = params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category)

        severity = params.get('severity')
        if severity and severity != 'all':
            qs = qs.filter(severity=severity)

        status_f = params.get('status')
        if status_f and status_f != 'all':
            qs = qs.filter(status=status_f)

        source = params.get('source')
        if source and source != 'all':
            qs = qs.filter(source=source)

        date_from = parse_date(params.get('date_from') or '')
        if date_from:
            qs = qs.filter(last_seen__date__gte=date_from)
        date_to = parse_date(params.get('date_to') or '')
        if date_to:
            qs = qs.filter(last_seen__date__lte=date_to)

        search = (params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(message__icontains=search) |
                Q(exception_type__icontains=search) |
                Q(path__icontains=search) |
                Q(user_display__icontains=search)
            )

        ordering = params.get('ordering') or '-last_seen'
        if ordering in VALID_ORDERINGS:
            qs = qs.order_by(ordering)
        return qs

    def perform_create(self, serializer):
        """Manual reports (maintenance logs, outages, bugs) from the UI."""
        from .services import make_fingerprint
        import uuid as _uuid
        serializer.save(
            source='manual',
            user=self.request.user,
            user_display=self.request.user.username,
            # Manual entries are individual records, never grouped together.
            fingerprint=make_fingerprint('manual', _uuid.uuid4().hex),
        )

    # ------------------------------------------------------------------
    def _apply_action(self, report, action_name, user, note='', assigned_to_id=None):
        if action_name == 'resolve':
            report.status = 'resolved'
            report.resolved_by = user
            report.resolved_at = timezone.now()
            if note:
                report.resolution_note = note
        elif action_name == 'ignore':
            report.status = 'ignored'
            if note:
                report.resolution_note = note
        elif action_name == 'investigate':
            report.status = 'investigating'
        elif action_name == 'reopen':
            report.status = 'open'
            report.resolved_by = None
            report.resolved_at = None
        elif action_name == 'assign':
            from django.contrib.auth import get_user_model
            User = get_user_model()
            report.assigned_to = User.objects.filter(pk=assigned_to_id).first() if assigned_to_id else None
            if report.status == 'open':
                report.status = 'investigating'
        else:
            return False
        report.save()
        return True

    # NB: named perform_action (with url_path='action') because a method named
    # `action` would clash with DRF's ViewSet.action string attribute.
    @action(detail=True, methods=['post'], url_path='action')
    def perform_action(self, request, pk=None):
        """Workflow action on one report."""
        report = self.get_object()
        ok = self._apply_action(
            report,
            request.data.get('action'),
            request.user,
            note=request.data.get('note', ''),
            assigned_to_id=request.data.get('assigned_to'),
        )
        if not ok:
            return Response(
                {'error': 'Invalid action. Use resolve, ignore, investigate, reopen or assign.'},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        return Response(SystemReportDetailSerializer(report).data)

    @action(detail=False, methods=['post'], url_path='bulk-action')
    def bulk_action(self, request):
        ids = request.data.get('ids') or []
        action_name = request.data.get('action')
        if not isinstance(ids, list) or not ids:
            return Response({'error': 'ids must be a non-empty list.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        updated = 0
        for report in SystemReport.objects.filter(id__in=ids):
            if self._apply_action(report, action_name, request.user,
                                  note=request.data.get('note', '')):
                updated += 1
        return Response({'updated': updated})

    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Dashboard summary: counts, severity/category/status breakdowns, trend."""
        now = timezone.now()
        qs = SystemReport.objects.all()
        active = qs.exclude(status__in=['resolved', 'ignored'])

        by_severity = {row['severity']: row['n'] for row in
                       active.values('severity').annotate(n=Count('id'))}
        by_status = {row['status']: row['n'] for row in
                     qs.values('status').annotate(n=Count('id'))}
        by_category = sorted(
            ({'category': row['category'],
              'label': dict(SystemReport.CATEGORY_CHOICES).get(row['category'], row['category']),
              'count': row['n']}
             for row in active.values('category').annotate(n=Count('id'))),
            key=lambda r: -r['count'],
        )

        # 14-day trend of newly-seen events (by last_seen date, split by severity band)
        trend_start = (now - timedelta(days=13)).date()
        trend = {}
        for row in qs.filter(last_seen__date__gte=trend_start) \
                     .values('last_seen__date', 'severity').annotate(n=Count('id')):
            day = row['last_seen__date'].isoformat()
            bucket = trend.setdefault(day, {'date': day, 'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'info': 0})
            bucket[row['severity']] = row['n']
        trend_list = []
        for i in range(14):
            day = (trend_start + timedelta(days=i)).isoformat()
            trend_list.append(trend.get(day, {'date': day, 'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'info': 0}))

        top_recurring = SystemReportListSerializer(
            active.order_by('-occurrence_count')[:5], many=True,
        ).data

        return Response({
            'totals': {
                'all': qs.count(),
                'open': by_status.get('open', 0),
                'investigating': by_status.get('investigating', 0),
                'resolved': by_status.get('resolved', 0),
                'ignored': by_status.get('ignored', 0),
                'critical_active': by_severity.get('critical', 0),
                'high_active': by_severity.get('high', 0),
                'last_24h': qs.filter(last_seen__gte=now - timedelta(hours=24)).count(),
                'resolved_7d': qs.filter(status='resolved', resolved_at__gte=now - timedelta(days=7)).count(),
            },
            'by_severity': by_severity,
            'by_category': by_category,
            'trend': trend_list,
            'top_recurring': top_recurring,
        })

    @action(detail=False, methods=['get'])
    def timeline(self, request):
        """Recent significant events for the timeline view."""
        significant = SystemReport.objects.filter(
            Q(severity__in=['critical', 'high', 'medium']) |
            Q(category__in=['security_alert', 'audit', 'maintenance', 'downtime', 'outage'])
        ).order_by('-last_seen')[:60]
        return Response(SystemReportListSerializer(significant, many=True).data)

    @action(detail=False, methods=['get'])
    def health(self, request):
        """Live health snapshot (DB, cache, realtime, CPU/RAM/disk)."""
        from .health import health_snapshot
        return Response(health_snapshot())

    @action(detail=False, methods=['get'])
    def export(self, request):
        """CSV export of the currently filtered reports (Excel-compatible)."""
        qs = self.get_queryset()[:5000]
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = (
            f'attachment; filename="system-reports-{timezone.now().date().isoformat()}.csv"'
        )
        response.write('﻿')  # UTF-8 BOM so Excel opens it correctly
        writer = csv.writer(response)
        writer.writerow([
            'Title', 'Category', 'Severity', 'Status', 'Occurrences',
            'First Seen', 'Last Seen', 'Path', 'Method', 'HTTP Status',
            'User', 'Exception', 'Message', 'Source',
        ])
        for r in qs:
            writer.writerow([
                r.title, r.get_category_display(), r.get_severity_display(),
                r.get_status_display(), r.occurrence_count,
                r.first_seen.isoformat(), r.last_seen.isoformat(),
                r.path, r.method, r.status_code or '',
                r.user_display, r.exception_type,
                (r.message or '').replace('\r', ' ').replace('\n', ' ')[:500],
                r.get_source_display(),
            ])
        return response
