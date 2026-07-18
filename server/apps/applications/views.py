"""
Application Views — multi-level document approval workflow.
"""
import re
from datetime import date, timedelta

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils.html import escape
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


def _user_student_profile(user):
    """The Student profile linked to a logged-in student/captain (or None)."""
    if getattr(user, 'role', None) not in ('student', 'captain'):
        return None
    pid = getattr(user, 'related_profile_id', None)
    if not pid:
        return None
    from apps.students.models import Student
    return Student.objects.filter(id=pid).first()


def _own_applications_q(student):
    """Q matching applications that belong to `student` (by FK or roll number)."""
    from django.db.models import Q
    rolls = {r for r in (
        getattr(student, 'currentRollNumber', None),
        getattr(student, 'rollNumber', None),
    ) if r}
    q = Q(student_id=student.id)
    if rolls:
        q |= Q(rollNumber__in=list(rolls))
    return q


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
    """Approvals whose signature may appear (approved + forwarded, in order)."""
    return [a for a in app.approvals.all() if a.action in ('approved', 'forwarded')]


# Template signature markers -> the approver role that fills them.
SIG_MARKERS = {
    '[SIG_REGISTRAR]': 'registrar',
    '[SIG_PRINCIPAL]': 'institute_head',
    '[SIG_DEPARTMENT_HEAD]': 'department_head',
}


def _signature_images(app, request):
    """Map approver-role -> signature <img> HTML for roles that have signed.

    A role only produces an image if it actually approved/forwarded the
    application AND the approver has an uploaded signature. Roles that acted
    without a signature image resolve to '' (blank line above the role label).
    Roles that never acted are absent from the map, so their marker is blanked.
    """
    images = {}
    for appr in _signing_approvals(app):
        role = appr.approver_role
        if not role or role in images:
            continue
        sig_html = ''
        if appr.approver and getattr(appr.approver, 'signature', None):
            url = appr.approver.signature.url
            if request:
                url = request.build_absolute_uri(url)
            sig_html = (
                f'<img src="{url}" alt="signature" '
                'style="max-height:56px;max-width:200px;object-fit:contain;" />'
            )
        images[role] = sig_html
    return images


_ASSET_DATA_URI_CACHE = {}


def _asset_data_uri(filename, mime):
    """Read a shared template logo and return it as a base64 data URI (cached).

    The approval-workflow document is served by Django, so the templates' relative
    `gov.svg` / `spi.png` references cannot resolve. Inlining them guarantees both
    logos render on the signed document, matching the front-end generation path.
    """
    if filename in _ASSET_DATA_URI_CACHE:
        return _ASSET_DATA_URI_CACHE[filename]
    uri = ''
    try:
        import base64
        from pathlib import Path
        from django.conf import settings
        path = Path(settings.BASE_DIR).parent / 'client' / 'admin-side' / 'public' / 'templates' / filename
        if path.exists():
            data = base64.b64encode(path.read_bytes()).decode('ascii')
            uri = f'data:{mime};base64,{data}'
    except Exception:
        uri = ''
    _ASSET_DATA_URI_CACHE[filename] = uri
    return uri


def _inline_template_assets(html):
    """Replace relative gov.svg / spi.png logo references with inline data URIs."""
    gov = _asset_data_uri('gov.svg', 'image/svg+xml')
    spi = _asset_data_uri('spi.png', 'image/png')
    if gov:
        html = re.sub(r'src=([\'"])(?:\./)?gov\.svg\1', f'src="{gov}"', html, flags=re.IGNORECASE)
    if spi:
        html = re.sub(r'src=([\'"])(?:\./)?spi\.png\1', f'src="{spi}"', html, flags=re.IGNORECASE)
    return html


def _gender_pronouns(gender):
    """Pronoun set for document prose. Formal documents avoid singular 'they',
    so an unspecified gender falls back to the masculine form (editable later)."""
    g = (gender or '').strip().lower()
    if g in ('female', 'woman', 'f'):
        return dict(subject='She', subject_lower='she', object='her',
                    possessive='Her', possessive_lower='her', parent_prefix='D/o')
    return dict(subject='He', subject_lower='he', object='him',
                possessive='His', possessive_lower='his', parent_prefix='S/o')


def _address_parts(value):
    """Best-effort split of a structured/plain address into named components."""
    parts = {'village': '', 'post_office': '', 'upazila': '', 'district': ''}
    if isinstance(value, dict):
        parts['village'] = value.get('village') or value.get('village_road') or value.get('line1') or ''
        parts['post_office'] = value.get('postOffice') or value.get('post_office') or ''
        parts['upazila'] = value.get('upazila') or value.get('thana') or value.get('upazila_thana') or ''
        parts['district'] = value.get('district') or ''
    elif isinstance(value, str) and value.strip():
        chunks = [c.strip() for c in value.split(',') if c.strip()]
        if chunks:
            parts['village'] = chunks[0]
            parts['district'] = chunks[-1]
    return parts


def _render_document_html(app, request):
    """Fill template placeholders from the application and composite signatures
    into their designated [SIG_*] markers (no generic appended footer)."""
    template = app.template
    html = (template.html_content if template else '') or ''

    # Institute info (system settings override defaults).
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

    # Richer fields from the linked student record when available.
    student = getattr(app, 'student', None)
    pron = _gender_pronouns(getattr(student, 'gender', '') if student else '')
    dob = cgpa = passing_year = ''
    addr = {'village': '', 'post_office': '', 'upazila': '', 'district': ''}
    if student:
        if getattr(student, 'dateOfBirth', None):
            dob = student.dateOfBirth.strftime('%d %B %Y')
        if getattr(student, 'gpa', None) is not None:
            cgpa = str(student.gpa)
        if getattr(student, 'passingYear', None):
            passing_year = str(student.passingYear)
        addr = _address_parts(
            getattr(student, 'presentAddress', None) or getattr(student, 'permanentAddress', None)
        )

    today = date.today()
    today_str = today.strftime('%d %B %Y')
    # ID-card validity: issue date + 4-year diploma span (guard leap-day 29 Feb).
    try:
        expiry = today.replace(year=today.year + 4)
    except ValueError:
        expiry = today + timedelta(days=365 * 4)
    expiry_str = expiry.strftime('%d %B %Y')
    name = app.fullNameEnglish or ''
    dept = app.department or ''
    serial = app.registrationNumber or str(app.id)[:8]

    ctx = {
        'name': name, 'STUDENT_NAME': name, 'studentName': name, 'fullNameEnglish': name,
        'fullNameBangla': app.fullNameBangla or '',
        'fatherName': app.fatherName or '', 'FATHER_NAME': app.fatherName or '',
        'motherName': app.motherName or '', 'MOTHER_NAME': app.motherName or '',
        'rollNumber': app.rollNumber or '', 'BOARD_ROLL': app.rollNumber or '', 'rollNo': app.rollNumber or '',
        'registrationNumber': app.registrationNumber or '', 'REGISTRATION_NUMBER': app.registrationNumber or '',
        'session': app.session or '', 'SESSION_YEAR': app.session or '',
        'department': dept, 'TECHNOLOGY': dept, 'shift': app.shift or '',
        'cgpa': cgpa, 'gpa': cgpa, 'dateOfBirth': dob,
        'PASSING_YEAR': passing_year, 'passingYear': passing_year,
        'VILLAGE': addr['village'], 'POST_OFFICE': addr['post_office'],
        'UPAZILA': addr['upazila'], 'DISTRICT': addr['district'],
        'GENDER_PRONOUN_SUBJECT': pron['subject'],
        'GENDER_PRONOUN_SUBJECT_LOWER': pron['subject_lower'],
        'GENDER_PRONOUN_OBJECT': pron['object'],
        'GENDER_PRONOUN_POSSESSIVE': pron['possessive'],
        'GENDER_PRONOUN_POSSESSIVE_LOWER': pron['possessive_lower'],
        'GENDER_PARENT_PREFIX': pron['parent_prefix'],
        'INSTITUTE_NAME': institute_name, 'INSTITUTE_ADDRESS': institute_address,
        'INSTITUTE_LOGO': logo_url,
        'GOVERNMENT_NAME': "Government of the People's Republic of Bangladesh",
        'OFFICE_NAME': 'Office of the Principal',
        'ISSUE_DATE': today_str, 'currentDate': today_str, 'Date': today_str,
        'EXPIRY_DATE': expiry_str, 'VALID_UNTIL': expiry_str, 'VALID_TILL': expiry_str,
        'expiryDate': expiry_str,
        'ISSUE_YEAR': str(today.year), 'SERIAL_NUMBER': serial,
        'REGISTRAR_NAME': names['registrar'], 'PRINCIPAL_NAME': names['institute_head'],
    }

    # Replace {{token}} occurrences we know about. Every value is HTML-escaped:
    # the template body is admin-authored (trusted) but these values come from
    # the public application submission, so interpolating them raw would be
    # stored XSS in the admin/applicant browser that views the document.
    for key, val in ctx.items():
        html = html.replace('{{' + key + '}}', escape(str(val)))

    # Known bracket-style tokens.
    bracket_map = {
        '[Student Name]': name, '[Father Name]': app.fatherName or '', '[Mother Name]': app.motherName or '',
        '[Roll No]': app.rollNumber or '', '[Reg No]': app.registrationNumber or '',
        '[Session]': app.session or '', '[Technology Name]': dept, '[Department]': dept,
        '[Date]': today_str,
    }
    for token, val in bracket_map.items():
        html = html.replace(token, escape(str(val)))

    # Composite signatures into their designated markers, then strip any unfilled ones.
    sig_images = _signature_images(app, request)
    for marker, role in SIG_MARKERS.items():
        html = html.replace(marker, sig_images.get(role, ''))
    html = re.sub(r'\[SIG_[A-Z_]+\]', '', html)

    # Blank any remaining mustache placeholders so the document looks clean.
    html = re.sub(r'\{\{[^}]+\}\}', '', html)

    # Inline the shared logo assets so they render on the Django-served document.
    html = _inline_template_assets(html)

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
        # Everything requires login now — there is no anonymous application
        # submission, tracking or document access. Approval actions are
        # admin-only; the rest fall back to the IsAuthenticated default.
        if self.action in ('approve', 'forward', 'reject'):
            return [IsAdminRole()]
        return super().get_permissions()

    def get_queryset(self):
        """
        Scope list/detail (and the document/my-applications actions, which funnel
        through this) strictly by role:
        - Principal / Registrar / superuser: every application.
        - Department Head: only applications forwarded to their department or
          ones they have already acted on (their inbox).
        - Student / Captain: ONLY their own applications (by student FK or roll).
        - Anyone else / anonymous: nothing.
        """
        qs = Application.objects.all().prefetch_related('approvals')
        user = self.request.user
        if not (user and user.is_authenticated):
            return qs.none()
        role = getattr(user, 'role', None)
        if user.is_superuser or role in ('institute_head', 'registrar'):
            return qs
        if role == 'department_head':
            from django.db.models import Q
            return qs.filter(
                Q(current_department_id=getattr(user, 'department_id', None))
                | Q(approvals__approver=user)
            ).distinct()
        if role in ('student', 'captain'):
            student = _user_student_profile(user)
            if not student:
                return qs.none()
            return qs.filter(_own_applications_q(student))
        return qs.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    # ---- Submission -------------------------------------------------------
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """Authenticated submission. Accepts `template` + `initial_assignee` (+ department_id)."""
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
    @action(detail=False, methods=['get'], url_path='my-applications')
    def my_applications(self, request):
        """The logged-in student's own applications. No roll-number lookup:
        the caller only ever sees applications tied to their own account."""
        student = _user_student_profile(request.user)
        if not student:
            # Non-students (admins/teachers) use the normal list endpoint.
            return Response({'count': 0, 'applications': []})

        applications = (
            Application.objects.filter(_own_applications_q(student))
            .order_by('-submittedAt').prefetch_related('approvals')
        )
        serializer = ApplicationSerializer(applications, many=True, context={'request': request})
        return Response({'count': applications.count(), 'applications': serializer.data})

    # ---- Final document (on-demand render) --------------------------------
    @action(detail=True, methods=['get'])
    def document(self, request, pk=None):
        # get_object() runs through the role-scoped get_queryset, so a student
        # can only reach their OWN application and an admin only those in scope.
        # No anonymous / roll-number access.
        application = self.get_object()
        if application.status != 'approved':
            return Response({'message': 'Document is available only after final approval.'},
                            status=status.HTTP_400_BAD_REQUEST)

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
