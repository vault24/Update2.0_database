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

# Department Head accounts carry shift as '1st_shift' / '2nd_shift'. Students and
# applications use the timetable vocabulary (Morning / Day). Everything routed to
# a head is normalised to the head vocabulary.
HEAD_SHIFT_LABELS = {'1st_shift': '1st Shift', '2nd_shift': '2nd Shift'}
_SHIFT_ALIASES = {
    '1st_shift': '1st_shift', '1st shift': '1st_shift', '1st': '1st_shift',
    'first': '1st_shift', 'first_shift': '1st_shift',
    'morning': '1st_shift', 'day shift': '1st_shift',
    '2nd_shift': '2nd_shift', '2nd shift': '2nd_shift', '2nd': '2nd_shift',
    'second': '2nd_shift', 'second_shift': '2nd_shift',
    'day': '2nd_shift', 'evening': '2nd_shift',
}


def normalize_head_shift(value):
    """Map any shift spelling to the Department Head vocabulary, or '' if unknown."""
    if not value:
        return ''
    return _SHIFT_ALIASES.get(str(value).strip().lower(), '')


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
        # A department has a head per shift — only the head of the targeted
        # shift may act. Heads with no shift on their account are not blocked
        # (legacy accounts), and neither is an application with no shift set.
        if app.current_shift and getattr(user, 'shift', ''):
            if user.shift != app.current_shift:
                return False
        return True
    return False


def _department_heads_for(department_id, head_shift):
    """
    Department Head accounts responsible for a department + shift.

    Falls back to every head of the department when no account matches the exact
    shift, so an application is never routed into a black hole.
    """
    if not department_id:
        return []
    heads = User.objects.filter(
        role='department_head', is_active=True, department_id=department_id
    )
    if head_shift:
        scoped = list(heads.filter(shift=head_shift))
        if scoped:
            return scoped
    return list(heads)


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
            recipients = _department_heads_for(app.current_department_id, app.current_shift)
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


# Design width (CSS px) per page size, keyed by the mm width found in the
# template's own @page / .page rules. mm / 25.4 * 96.
_PAGE_WIDTH_PX = {'210': 794, '297': 1123, '53.98': 204}

_SCREEN_ONLY_CONTROL_RE = re.compile(
    r'<div[^>]*class="[^"]*\b(?:controls|no-print)\b[^"]*"[^>]*>.*?</div>',
    re.IGNORECASE | re.DOTALL,
)
_PRINT_BUTTON_RE = re.compile(
    r'<button\b[^>]*onclick\s*=\s*["\'][^"\']*(?:window\.)?print\(\)[^"\']*["\'][^>]*>.*?</button>',
    re.IGNORECASE | re.DOTALL,
)
_VIEWPORT_RE = re.compile(r'<meta\s+name=["\']viewport["\'][^>]*>', re.IGNORECASE)

# Injected into every rendered document. Fixes the "renders differently on
# different devices" problem: the page has a fixed physical size, so mobile
# browsers must not reflow it or inflate its text.
_FIXED_LAYOUT_CSS = """
<style id="fixed-document-layout">
/* Documents are a fixed physical size (A4 / CR80). Freeze the layout so the
   downloaded and printed output is identical on phone, tablet and desktop. */
html { -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; text-size-adjust: 100%; }
html, body { min-width: __WIDTH__px; }
@media print { html, body { min-width: 0; } }
/* Belt and braces: no in-document print/download control ever reaches the
   exported file — printing is driven by the surrounding app. */
.controls, .no-print { display: none !important; }
</style>
"""


def _document_design_width(html):
    """The document's own design width in CSS px, inferred from its page size."""
    match = re.search(r'width:\s*(210|297|53\.98)mm', html, flags=re.IGNORECASE)
    if match:
        return _PAGE_WIDTH_PX[match.group(1)]
    if re.search(r'@page[^{]*\{[^}]*landscape', html, flags=re.IGNORECASE):
        return 1123
    return 794


def _harden_document_html(html):
    """
    Make a stored template safe and device-consistent at render time.

    Templates live in the database and may have been seeded before these rules
    existed (or edited by an admin), so the guarantees are re-applied on every
    render rather than trusted to the source file:
      * strip any in-document print/download control (it would otherwise end up
        in the downloaded and printed output);
      * pin the viewport to the document's design width and disable mobile text
        auto-sizing, so the layout never reflows or gets clipped on a phone.
    """
    if not html:
        return html

    html = _SCREEN_ONLY_CONTROL_RE.sub('', html)
    html = _PRINT_BUTTON_RE.sub('', html)

    width = _document_design_width(html)
    fixed_meta = (
        f'<meta name="viewport" content="width={width}, initial-scale=1.0, '
        'viewport-fit=cover">'
    )
    if _VIEWPORT_RE.search(html):
        html = _VIEWPORT_RE.sub(fixed_meta, html, count=1)
    elif '<head>' in html.lower():
        html = re.sub(r'(<head[^>]*>)', r'\1' + fixed_meta, html, count=1, flags=re.IGNORECASE)

    css = _FIXED_LAYOUT_CSS.replace('__WIDTH__', str(width))
    if '</head>' in html.lower():
        html = re.sub(r'(</head>)', css + r'\1', html, count=1, flags=re.IGNORECASE)
    else:
        html = css + html
    return html


def _inline_template_assets(html):
    """Replace relative gov.svg / spi.png logo references with inline data URIs."""
    gov = _asset_data_uri('gov.svg', 'image/svg+xml')
    spi = _asset_data_uri('spi.png', 'image/png')
    if gov:
        html = re.sub(r'src=([\'"])(?:\./)?gov\.svg\1', f'src="{gov}"', html, flags=re.IGNORECASE)
    if spi:
        html = re.sub(r'src=([\'"])(?:\./)?spi\.png\1', f'src="{spi}"', html, flags=re.IGNORECASE)
    return html


def _student_photo_data_uri(student):
    """
    The student's profile photo as an inline base64 data URI.

    The signed document is downloaded and re-opened as a standalone file, so a
    plain URL would break (no session, possibly no network). Inlining is what
    makes the photo actually appear on the printed / downloaded ID card.
    Returns '' when there is no readable photo.
    """
    if not student:
        return ''
    raw = (getattr(student, 'profilePhoto', '') or '').strip()
    if not raw:
        return ''
    if raw.startswith('data:'):
        return raw

    import base64
    import mimetypes
    from pathlib import Path
    from django.conf import settings as dj_settings

    # profilePhoto is stored as '/files/<relative path>' inside the structured
    # store (see Document.profile_photo_path).
    rel = raw
    for prefix in ('/files/', 'files/'):
        if rel.startswith(prefix):
            rel = rel[len(prefix):]
            break
    rel = rel.lstrip('/')
    if not rel or '..' in rel:
        return ''

    candidates = []
    try:
        from utils.structured_file_storage import structured_storage
        info = structured_storage.get_file_info(rel)
        if info and info.get('exists') and info.get('storage_path'):
            candidates.append(Path(info['storage_path']))
    except Exception:
        pass
    base_dir = Path(dj_settings.BASE_DIR)
    candidates.append(base_dir / 'storage' / rel)
    candidates.append(Path(getattr(dj_settings, 'MEDIA_ROOT', base_dir / 'media')) / rel)

    for path in candidates:
        try:
            if path.is_file():
                mime = mimetypes.guess_type(path.name)[0] or 'image/jpeg'
                data = base64.b64encode(path.read_bytes()).decode('ascii')
                return f'data:{mime};base64,{data}'
        except Exception:
            continue
    return ''


def _public_profile_url(app, student):
    """The shareable /student/<roll> page this card's QR code points at."""
    identifier = (
        (getattr(student, 'currentRollNumber', '') if student else '')
        or app.rollNumber
        or (str(student.id) if student else '')
    )
    if not identifier:
        return ''
    from urllib.parse import quote
    from apps.notifications.dispatch import student_portal_url
    return student_portal_url(f'/student/{quote(str(identifier))}')


def _qr_code_img(text):
    """
    An <img> tag holding a base64 PNG QR code for `text`, or '' when there is
    nothing to encode. Inline data keeps the code visible in the downloaded
    file, exactly like the front-end generation path does.
    """
    value = (text or '').strip()
    if not value:
        return ''
    try:
        import base64
        import io
        import qrcode

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=6,
            border=2,
        )
        qr.add_data(value)
        qr.make(fit=True)
        buf = io.BytesIO()
        qr.make_image(fill_color='black', back_color='white').save(buf, format='PNG')
        data = base64.b64encode(buf.getvalue()).decode('ascii')
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning('QR code generation failed: %s', exc)
        return ''

    return (
        f'<img src="data:image/png;base64,{data}" alt="Profile QR code" '
        'style="width:100%;height:100%;display:block;object-fit:contain;" />'
    )


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
    blood_group = phone = emergency_contact = ''
    addr = {'village': '', 'post_office': '', 'upazila': '', 'district': ''}
    if student:
        blood_group = getattr(student, 'bloodGroup', '') or ''
        phone = getattr(student, 'mobileStudent', '') or ''
        # Emergency contact on the ID card: the guardian's number, else the student's.
        emergency_contact = getattr(student, 'guardianMobile', '') or phone
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

    # ID-card assets. Both are inlined so they survive download/print — a plain
    # URL would resolve to nothing once the file leaves the browser session.
    photo_uri = _student_photo_data_uri(student)
    profile_url = _public_profile_url(app, student)

    ctx = {
        'photo': photo_uri, 'profilePhoto': photo_uri, 'STUDENT_PHOTO': photo_uri,
        'publicProfileUrl': profile_url, 'PUBLIC_PROFILE_URL': profile_url,
        'bloodGroup': blood_group, 'BLOOD_GROUP': blood_group,
        'phoneNumber': phone, 'PHONE_NUMBER': phone, 'mobile': phone,
        'emergencyContact': emergency_contact, 'EMERGENCY_CONTACT': emergency_contact,
        'email': (getattr(student, 'email', '') if student else '') or app.email or '',
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

    # QR code is generated HTML (an <img> tag), so it is substituted raw — its
    # only variable part is base64 we produced ourselves, never user input.
    qr_img = _qr_code_img(profile_url)
    for token in ('{{QR_CODE}}', '{{qrCode}}', '{{qr_code}}'):
        html = html.replace(token, qr_img)

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

    # Strip in-document print controls and pin the layout so the exported file
    # is identical on every device.
    html = _harden_document_html(html)

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
            # Their inbox: applications routed to their department AND their
            # shift (an unset shift on either side stays visible so legacy
            # accounts/records are not hidden), plus anything they acted on.
            mine = Q(current_department_id=getattr(user, 'department_id', None))
            if getattr(user, 'shift', ''):
                mine &= Q(current_shift__in=['', user.shift])
            return qs.filter(mine | Q(approvals__approver=user)).distinct()
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
            # Route to the head of the applicant's own shift when it is known.
            application.current_shift = normalize_head_shift(
                request.data.get('head_shift') or application.shift
            )

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
        application.current_shift = ''
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
        new_shift = ''
        if target == 'department_head':
            dept_id = request.data.get('department_id') or request.data.get('department')
            try:
                from apps.departments.models import Department
                new_department = Department.objects.filter(id=dept_id).first() if dept_id else None
            except Exception:
                new_department = None
            if not new_department:
                return Response({'detail': 'Select a department to forward to.'},
                                status=status.HTTP_400_BAD_REQUEST)

            # A department has one head per shift, so the shift decides WHICH
            # head receives it and is therefore required.
            raw_shift = request.data.get('shift') or request.data.get('head_shift')
            new_shift = normalize_head_shift(raw_shift)
            if not new_shift:
                return Response(
                    {'detail': 'Select the shift of the Department Head to forward to (1st Shift or 2nd Shift).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not _department_heads_for(new_department.id, new_shift):
                return Response(
                    {'detail': f'No active Department Head account exists for {new_department.name}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            forwarded_to_name = (
                f"{ROLE_LABELS['department_head']} — {new_department.name} "
                f"({HEAD_SHIFT_LABELS[new_shift]})"
            )

        _record_approval(
            application, request.user, 'forwarded', notes=notes,
            forwarded_to_role=target, forwarded_to_name=forwarded_to_name,
        )

        application.current_approver_role = target
        application.current_department = new_department
        application.current_shift = new_shift
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
        application.current_shift = ''
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
        response = HttpResponse(html, content_type='text/html')

        # `?download=1` -> serve as a file attachment so the browser downloads it
        # instead of only rendering it inline (the student "Download" button).
        if request.query_params.get('download') in ('1', 'true', 'yes'):
            template = getattr(application, 'template', None)
            base = (getattr(template, 'name', None) or application.applicationType or 'document')
            safe = re.sub(r'[^A-Za-z0-9]+', '_', base).strip('_') or 'document'
            roll = application.rollNumber or application.registrationNumber or ''
            filename = f"{safe}_{roll}.html" if roll else f"{safe}.html"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

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
