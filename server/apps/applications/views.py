"""
Application Views — multi-level document approval workflow.
"""
import re
from datetime import date

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.authentication.permissions import IsAdminRole
from .models import Application, ApplicationApproval
from .serializers import (
    ApplicationSerializer,
    ApplicationSubmitSerializer,
    ApplicationReviewSerializer,
)

User = get_user_model()

ROLE_LABELS = {
    'registrar': 'Registrar',
    'institute_head': 'Principal',
    'department_head': 'Department Head',
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _email_applicant(application, *, subject, heading, intro, accent_label,
                     accent_color, accent_soft, body_lines=None):
    """Send a branded email to the application's contact email."""
    if not getattr(application, 'email', None):
        return
    try:
        from apps.notifications.email_service import send_branded_email
        details = [
            {'label': 'Applicant', 'value': application.fullNameEnglish},
            {'label': 'Type', 'value': application.applicationType},
            {'label': 'Subject', 'value': application.subject},
            {'label': 'Status', 'value': application.status.title()},
        ]
        send_branded_email(
            subject, application.email,
            heading=heading,
            greeting=f"Hello {application.fullNameEnglish},",
            intro=intro, body_lines=body_lines, details=details,
            accent_label=accent_label, accent_color=accent_color, accent_soft=accent_soft,
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Application email failed: %s", exc)


def _link_student(application):
    """Best-effort link to a Student account by current roll number."""
    try:
        from apps.students.models import Student
        student = Student.objects.filter(
            currentRollNumber=application.rollNumber
        ).first()
        if student:
            application.student = student
    except Exception:
        pass


def _actor_name(user):
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.username


def _user_can_act(user, app):
    """Whether `user` may act on `app` at its current stage."""
    if not (user and user.is_authenticated):
        return False
    role = getattr(user, 'role', None)
    target = app.current_approver_role
    if target == 'registrar':
        return role == 'registrar'
    if target == 'institute_head':
        return role == 'institute_head' or user.is_superuser
    if target == 'department_head':
        if role != 'department_head':
            return False
        if app.current_department_id and getattr(user, 'department_id', None) != app.current_department_id:
            return False
        return True
    return False


def _record_approval(app, user, action_value, *, notes='',
                     forwarded_to_role='', forwarded_to_name=''):
    order = app.approvals.count() + 1
    return ApplicationApproval.objects.create(
        application=app,
        approver=user,
        approver_role=getattr(user, 'role', '') or '',
        approver_name=_actor_name(user),
        action=action_value,
        notes=notes or '',
        forwarded_to_role=forwarded_to_role,
        forwarded_to_name=forwarded_to_name,
        order=order,
    )


def _notify_next_approver(app):
    """Notify the approver(s) who should now review the application."""
    try:
        from apps.notifications.dispatch import notify_users
        recipients = []
        role = app.current_approver_role
        if role == 'department_head' and app.current_department_id:
            recipients = list(User.objects.filter(role='department_head', department_id=app.current_department_id))
        elif role:
            recipients = list(User.objects.filter(role=role))
        if recipients:
            notify_users(
                recipients,
                title='Application awaiting your approval',
                message=f"{app.fullNameEnglish} — {app.applicationType}: {app.subject}",
                notification_type='application_submitted',
            )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Document rendering (on-demand, with composited signatures)
# ---------------------------------------------------------------------------
def _signing_approvals(app):
    """Approvals whose signature should appear (approved + forwarded, in order)."""
    return [a for a in app.approvals.all() if a.action in ('approved', 'forwarded')]


def _signature_footer(app, request):
    blocks = []
    for appr in _signing_approvals(app):
        sig_html = ''
        if appr.approver and getattr(appr.approver, 'signature', None):
            url = appr.approver.signature.url
            if request:
                url = request.build_absolute_uri(url)
            sig_html = f'<img src="{url}" alt="signature" style="max-height:60px;max-width:180px;object-fit:contain;" />'
        label = ROLE_LABELS.get(appr.approver_role, appr.approver_role or '')
        when = appr.created_at.strftime('%d %b %Y') if appr.created_at else ''
        blocks.append(
            '<div style="display:inline-block;text-align:center;margin:0 24px;min-width:180px;">'
            f'<div style="height:64px;display:flex;align-items:flex-end;justify-content:center;">{sig_html}</div>'
            '<div style="border-top:1px solid #000;margin-top:4px;padding-top:4px;font-size:13px;">'
            f'<strong>{appr.approver_name}</strong><br/>{label}<br/><span style="font-size:11px;color:#555;">{when}</span>'
            '</div></div>'
        )
    if not blocks:
        return ''
    return (
        '<div style="margin-top:48px;display:flex;flex-wrap:wrap;justify-content:space-around;'
        'gap:16px;page-break-inside:avoid;">' + ''.join(blocks) + '</div>'
    )


def _render_document_html(app, request):
    """Fill template placeholders from the application and append signatures."""
    template = app.template
    html = (template.html_content if template else '') or ''

    # Institute info
    institute_name, institute_address, logo_url = 'Sirajganj Polytechnic Institute', '', ''
    try:
        from apps.system_settings.models import SystemSettings
        s = SystemSettings.get_settings()
        institute_name = s.institute_name or institute_name
        institute_address = s.institute_address or ''
        if getattr(s, 'institute_logo', None):
            logo_url = s.institute_logo.url
            if request:
                logo_url = request.build_absolute_uri(logo_url)
    except Exception:
        pass

    # Approver names (for inline {{REGISTRAR_NAME}} / {{PRINCIPAL_NAME}} lines)
    names = {'registrar': '', 'institute_head': '', 'department_head': ''}
    for appr in _signing_approvals(app):
        if appr.approver_role in names and not names[appr.approver_role]:
            names[appr.approver_role] = appr.approver_name

    today = date.today().strftime('%d %B %Y')
    name = app.fullNameEnglish or ''
    dept = app.department or ''

    ctx = {
        'name': name, 'STUDENT_NAME': name, 'studentName': name, 'fullNameEnglish': name,
        'fullNameBangla': app.fullNameBangla or '',
        'fatherName': app.fatherName or '', 'FATHER_NAME': app.fatherName or '',
        'motherName': app.motherName or '', 'MOTHER_NAME': app.motherName or '',
        'rollNumber': app.rollNumber or '', 'BOARD_ROLL': app.rollNumber or '', 'rollNo': app.rollNumber or '',
        'registrationNumber': app.registrationNumber or '', 'REGISTRATION_NUMBER': app.registrationNumber or '',
        'session': app.session or '', 'SESSION_YEAR': app.session or '',
        'department': dept, 'TECHNOLOGY': dept, 'shift': app.shift or '',
        'INSTITUTE_NAME': institute_name, 'INSTITUTE_ADDRESS': institute_address,
        'INSTITUTE_LOGO': logo_url,
        'GOVERNMENT_NAME': "Government of the People's Republic of Bangladesh",
        'ISSUE_DATE': today, 'currentDate': today, 'Date': today,
        'REGISTRAR_NAME': names['registrar'], 'PRINCIPAL_NAME': names['institute_head'],
    }

    # Replace {{token}} occurrences we know about.
    for key, val in ctx.items():
        html = html.replace('{{' + key + '}}', str(val))

    # Known bracket-style tokens.
    bracket_map = {
        '[Student Name]': name, '[Father Name]': app.fatherName or '', '[Mother Name]': app.motherName or '',
        '[Roll No]': app.rollNumber or '', '[Reg No]': app.registrationNumber or '',
        '[Session]': app.session or '', '[Technology Name]': dept, '[Department]': dept,
        '[Date]': today,
    }
    for token, val in bracket_map.items():
        html = html.replace(token, str(val))

    # Blank any remaining mustache placeholders so the document looks clean.
    html = re.sub(r'\{\{[^}]+\}\}', '', html)

    footer = _signature_footer(app, request)
    if footer:
        if '</body>' in html.lower():
            idx = html.lower().rindex('</body>')
            html = html[:idx] + footer + html[idx:]
        else:
            html += footer
    return html


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------
class ApplicationViewSet(viewsets.ModelViewSet):
    """Applications + multi-level approval workflow."""
    queryset = Application.objects.all().prefetch_related('approvals')
    serializer_class = ApplicationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'applicationType', 'department', 'current_approver_role']
    ordering_fields = ['submittedAt', 'reviewedAt']
    ordering = ['-submittedAt']

    def get_permissions(self):
        if self.action in ('submit', 'my_applications', 'document'):
            return [permissions.AllowAny()]
        if self.action in ('approve', 'forward', 'reject'):
            return [IsAdminRole()]
        return super().get_permissions()

    def get_queryset(self):
        """
        Scope the list/detail by role:
        - Principal / Registrar / superuser: every application.
        - Department Head: only applications forwarded to their department or
          ones they have already acted on (their inbox).
        Public actions (submit / my-applications / document) are authorized
        inside the action, so they always see the full set here.
        """
        qs = Application.objects.all().prefetch_related('approvals')
        if self.action in ('submit', 'my_applications', 'document'):
            return qs
        user = self.request.user
        if not (user and user.is_authenticated):
            return qs
        role = getattr(user, 'role', None)
        if user.is_superuser or role in ('institute_head', 'registrar'):
            return qs
        if role == 'department_head':
            from django.db.models import Q
            return qs.filter(
                Q(current_department_id=getattr(user, 'department_id', None))
                | Q(approvals__approver=user)
            ).distinct()
        return qs.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    # ---- Submission -------------------------------------------------------
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def submit(self, request):
        """Public submission. Accepts `template` + `initial_assignee` (+ department_id)."""
        serializer = ApplicationSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        template_ref = serializer.validated_data.pop('template', None)
        application = Application(**serializer.validated_data)

        # Resolve template (by slug or id)
        if template_ref:
            try:
                from apps.documents.models import DocumentTemplate
                tmpl = (DocumentTemplate.objects.filter(slug=template_ref).first()
                        or DocumentTemplate.objects.filter(id=template_ref).first())
                if tmpl:
                    application.template = tmpl
            except Exception:
                pass

        # Initial assignee routing (default registrar)
        assignee = (request.data.get('initial_assignee') or 'registrar').strip()
        if assignee not in ('registrar', 'institute_head', 'department_head'):
            assignee = 'registrar'
        application.current_approver_role = assignee
        application.stage = 1
        if assignee == 'department_head':
            dept_id = request.data.get('department_id') or request.data.get('department')
            try:
                from apps.departments.models import Department
                dept = Department.objects.filter(id=dept_id).first() if dept_id else None
                if dept:
                    application.current_department = dept
            except Exception:
                pass

        _link_student(application)
        application.save()

        _email_applicant(
            application,
            subject="Application Received - SIPI",
            heading="Application Received",
            intro=f"This confirms that we have received your {application.applicationType or 'application'}. "
                  "You can track its progress from your Applications page.",
            accent_label="Received", accent_color="#16a34a", accent_soft="#ecfdf5",
        )
        _notify_next_approver(application)

        return Response(
            ApplicationSerializer(application, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ---- Approve & finish -------------------------------------------------
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        application = self.get_object()
        if application.status != 'pending':
            return Response(
                {'error': 'Application already reviewed',
                 'details': f'This application has already been {application.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not _user_can_act(request.user, application):
            return Response({'detail': 'You are not the current approver for this application.'},
                            status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('reviewNotes', '') or request.data.get('notes', '')
        _record_approval(application, request.user, 'approved', notes=notes)

        application.status = 'approved'
        application.reviewedBy = _actor_name(request.user)
        application.reviewNotes = notes
        application.reviewedAt = timezone.now()
        application.current_approver_role = ''
        application.current_approver = None
        application.current_department = None
        application.save()

        _email_applicant(
            application,
            subject="Application Approved - SIPI",
            heading="Application Approved",
            intro="Good news! Your application has been fully approved. You can now download the signed document from your Applications page.",
            body_lines=[notes] if notes else None,
            accent_label="Approved", accent_color="#16a34a", accent_soft="#ecfdf5",
        )
        return Response(ApplicationSerializer(application, context={'request': request}).data)

    # ---- Forward for second approval -------------------------------------
    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        application = self.get_object()
        if application.status != 'pending':
            return Response({'error': 'Application already reviewed'},
                            status=status.HTTP_400_BAD_REQUEST)
        if application.stage != 1:
            return Response({'detail': 'This application has already been forwarded.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _user_can_act(request.user, application):
            return Response({'detail': 'You are not the current approver for this application.'},
                            status=status.HTTP_403_FORBIDDEN)

        target = (request.data.get('forward_to') or 'institute_head').strip()
        if target not in ('institute_head', 'department_head'):
            return Response({'detail': 'forward_to must be institute_head or department_head.'},
                            status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('reviewNotes', '') or request.data.get('notes', '')
        forwarded_to_name = ROLE_LABELS.get(target, target)
        new_department = None
        if target == 'department_head':
            dept_id = request.data.get('department_id') or request.data.get('department')
            try:
                from apps.departments.models import Department
                new_department = Department.objects.filter(id=dept_id).first() if dept_id else None
            except Exception:
                new_department = None
            if not new_department:
                return Response({'detail': 'Select a department head to forward to.'},
                                status=status.HTTP_400_BAD_REQUEST)
            forwarded_to_name = f"{ROLE_LABELS['department_head']} — {new_department.name}"

        _record_approval(
            application, request.user, 'forwarded', notes=notes,
            forwarded_to_role=target, forwarded_to_name=forwarded_to_name,
        )

        application.current_approver_role = target
        application.current_department = new_department
        application.current_approver = None
        application.stage = 2
        application.reviewedBy = _actor_name(request.user)
        application.save()

        _notify_next_approver(application)
        _email_applicant(
            application,
            subject="Application Update - SIPI",
            heading="Application Forwarded",
            intro=f"Your application has been reviewed and forwarded to the {forwarded_to_name} for final approval.",
            accent_label="In Progress", accent_color="#2563eb", accent_soft="#eff6ff",
        )
        return Response(ApplicationSerializer(application, context={'request': request}).data)

    # ---- Reject -----------------------------------------------------------
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        application = self.get_object()
        if application.status != 'pending':
            return Response({'error': 'Application already reviewed'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _user_can_act(request.user, application):
            return Response({'detail': 'You are not the current approver for this application.'},
                            status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('reviewNotes', '') or request.data.get('notes', '')
        if not notes:
            return Response({'error': 'Review notes required',
                             'details': 'Please provide a reason for rejection'},
                            status=status.HTTP_400_BAD_REQUEST)

        _record_approval(application, request.user, 'rejected', notes=notes)
        application.status = 'rejected'
        application.reviewedBy = _actor_name(request.user)
        application.reviewNotes = notes
        application.reviewedAt = timezone.now()
        application.current_approver_role = ''
        application.current_approver = None
        application.current_department = None
        application.save()

        _email_applicant(
            application,
            subject="Application Update - SIPI",
            heading="Application Not Approved",
            intro="After review, your application was not approved.",
            body_lines=[f"Reason: {notes}"],
            accent_label="Not Approved", accent_color="#dc2626", accent_soft="#fef2f2",
        )
        return Response(ApplicationSerializer(application, context={'request': request}).data)

    # ---- Student listing --------------------------------------------------
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='my-applications')
    def my_applications(self, request):
        roll_number = request.query_params.get('rollNumber')
        registration_number = request.query_params.get('registrationNumber')
        if not roll_number:
            return Response({'error': 'Roll number required',
                             'details': 'Please provide rollNumber query parameter'},
                            status=status.HTTP_400_BAD_REQUEST)

        applications = Application.objects.filter(rollNumber=roll_number)
        if registration_number:
            applications = applications.filter(registrationNumber=registration_number)
        applications = applications.order_by('-submittedAt').prefetch_related('approvals')

        serializer = ApplicationSerializer(applications, many=True, context={'request': request})
        return Response({'count': applications.count(), 'applications': serializer.data})

    # ---- Final document (on-demand render) --------------------------------
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def document(self, request, pk=None):
        application = self.get_object()
        if application.status != 'approved':
            return Response({'message': 'Document is available only after final approval.'},
                            status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        allowed = False
        if user and user.is_authenticated:
            role = getattr(user, 'role', None)
            if user.is_superuser or role in ('registrar', 'institute_head'):
                allowed = True
            elif application.approvals.filter(approver=user).exists():
                allowed = True
        if not allowed:
            # Student (roll-number) trust model, same as my-applications.
            roll = request.query_params.get('rollNumber')
            if roll and roll == application.rollNumber:
                allowed = True
        if not allowed:
            return Response({'detail': 'You are not authorized to view this document.'},
                            status=status.HTTP_403_FORBIDDEN)

        html = _render_document_html(application, request)
        return HttpResponse(html, content_type='text/html')

    # ---- Legacy review ----------------------------------------------------
    @action(detail=True, methods=['put'])
    def review(self, request, pk=None):
        application = self.get_object()
        serializer = ApplicationReviewSerializer(data=request.data)
        if serializer.is_valid():
            application.status = serializer.validated_data['status']
            application.reviewedBy = serializer.validated_data['reviewedBy']
            application.reviewNotes = serializer.validated_data.get('reviewNotes', '')
            application.reviewedAt = timezone.now()
            application.save()
            return Response(ApplicationSerializer(application, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
