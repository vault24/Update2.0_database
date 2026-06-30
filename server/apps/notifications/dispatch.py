"""
High-level notification dispatch.

Every helper here does BOTH:
  1. creates an in-app notification (so the bell icon / notifications page update), and
  2. sends a branded email (server/.env SMTP, async, error-handled).

Views across the project call these helpers so notification behaviour stays
modular, consistent and easy to extend. Nothing here ever raises into the
caller — a failed notification/email must never break the underlying action.
"""
import logging

from django.contrib.auth import get_user_model

from .services import NotificationService
from .email_service import send_branded_email

logger = logging.getLogger(__name__)
User = get_user_model()

# Accent presets: (color, soft background, pill label)
ACCENTS = {
    "success": ("#16a34a", "#ecfdf5", "Success"),
    "info": ("#2563eb", "#eff6ff", "Notification"),
    "warning": ("#d97706", "#fffbeb", "Action Needed"),
    "danger": ("#dc2626", "#fef2f2", "Important"),
}


def _greeting(user):
    name = (getattr(user, "first_name", "") or getattr(user, "username", "") or "there").strip()
    return f"Hello {name},"


def _accent(kind, label=None):
    color, soft, default_label = ACCENTS.get(kind, ACCENTS["info"])
    return {"accent_color": color, "accent_soft": soft, "accent_label": label or default_label}


def _create_internal(user, notification_type, title, message, data=None):
    try:
        NotificationService.create_notification(user, notification_type, title, message, data or {})
    except Exception as exc:  # noqa: BLE001
        logger.error("In-app notification failed for user %s: %s", getattr(user, "id", None), exc)


# ---------------------------------------------------------------------------
# Recipient lookups
# ---------------------------------------------------------------------------

def get_principals():
    """Active Principal (institute_head) users."""
    return list(User.objects.filter(role="institute_head", is_active=True))


def get_department_head(department):
    """Active Department Head for a department, or None."""
    if department is None:
        return None
    return User.objects.filter(
        role="department_head", department=department, is_active=True
    ).first()


def get_notice_recipients():
    """Active users who should receive notices: students, captains, teachers."""
    return User.objects.filter(
        is_active=True, role__in=["student", "captain", "teacher"]
    )


def get_active_students():
    """Active students (including captains, who are students with a role)."""
    return User.objects.filter(is_active=True, role__in=["student", "captain"])


# ---------------------------------------------------------------------------
# Generic single / bulk dispatch
# ---------------------------------------------------------------------------

def notify(user, *, notification_type, title, message, data=None, send_email=True,
           accent="info", accent_label=None, details=None, body_lines=None,
           highlight=None, cta_label=None, cta_url=None, subject=None, intro=None):
    """Notify a single user (in-app + email)."""
    if user is None:
        return
    _create_internal(user, notification_type, title, message, data)

    if send_email and getattr(user, "email", None):
        send_branded_email(
            subject or title,
            user.email,
            heading=title,
            greeting=_greeting(user),
            intro=intro or message,
            body_lines=body_lines,
            details=details,
            highlight=highlight,
            cta_label=cta_label,
            cta_url=cta_url,
            **_accent(accent, accent_label),
        )


def notify_users(users, *, notification_type, title, message, data=None,
                 accent="info", accent_label=None, details=None, body_lines=None,
                 subject=None, intro=None, send_email=True):
    """
    Notify many users (in-app for each + a single BCC email).

    `users` may be a queryset or iterable of User objects.
    """
    users = list(users)
    if not users:
        return

    for user in users:
        _create_internal(user, notification_type, title, message, data)

    if send_email:
        emails = [u.email for u in users if getattr(u, "email", None)]
        if emails:
            send_branded_email(
                subject or title,
                # BCC everyone; the email service uses the system address as the
                # visible "To" so recipients never see each other's addresses.
                to=[],
                bcc=emails,
                heading=title,
                intro=intro or message,
                body_lines=body_lines,
                details=details,
                **_accent(accent, accent_label),
            )


# ---------------------------------------------------------------------------
# Specific events
# ---------------------------------------------------------------------------

def send_welcome_email(user, *, portal="admin", role_label=None, details=None):
    """Welcome a newly-created account (admin or student)."""
    portal_name = "Admin Portal" if portal == "admin" else "Student Portal"
    title = f"Welcome to SIPI {portal_name}"
    message = (
        f"Your {portal_name} account has been created successfully. "
        "You can now sign in and start using the system."
    )
    rows = details or []
    if role_label:
        rows = [{"label": "Role", "value": role_label}] + rows
    notify(
        user,
        notification_type="welcome",
        title=title,
        message=message,
        accent="success",
        accent_label="Welcome",
        intro=f"Welcome aboard! {message}",
        details=rows or None,
        send_email=True,
    )


def notify_admin_signup_request(signup_request):
    """A new admin signup request was submitted -> notify Principal(s)."""
    principals = get_principals()
    if not principals:
        logger.warning("No Principal found to notify about admin signup request %s", signup_request.id)
        return
    role_label = dict(
        registrar="Registrar", department_head="Department Head", institute_head="Principal"
    ).get(getattr(signup_request, "requested_role", ""), getattr(signup_request, "requested_role", ""))
    details = [
        {"label": "Name", "value": f"{signup_request.first_name} {signup_request.last_name}".strip()},
        {"label": "Username", "value": signup_request.username},
        {"label": "Email", "value": signup_request.email},
        {"label": "Requested Role", "value": role_label},
    ]
    notify_users(
        principals,
        notification_type="signup_request",
        title="New Admin Signup Request",
        message=f"{signup_request.first_name} {signup_request.last_name} requested a {role_label} account.",
        details=details,
        accent="warning",
        accent_label="Approval Needed",
        data={"signup_request_id": str(signup_request.id)},
    )


def notify_teacher_signup_request(teacher_request):
    """
    A new teacher signup request was submitted. Notify the Department Head of the
    requested teacher's department; fall back to the Principal if there is no
    department / no head available.
    """
    department = getattr(teacher_request, "department", None)
    head = get_department_head(department)
    recipients = [head] if head else get_principals()
    recipients = [r for r in recipients if r]
    if not recipients:
        logger.warning("No recipient found for teacher signup request %s", teacher_request.id)
        return

    dept_name = getattr(department, "name", None) or "Non-departmental"
    details = [
        {"label": "Teacher", "value": teacher_request.full_name_english},
        {"label": "Designation", "value": teacher_request.designation},
        {"label": "Department", "value": dept_name},
        {"label": "Email", "value": teacher_request.email},
        {"label": "Mobile", "value": teacher_request.mobile_number},
    ]
    notify_users(
        recipients,
        notification_type="teacher_request",
        title="New Teacher Signup Request",
        message=f"{teacher_request.full_name_english} ({dept_name}) has requested a teacher account and is awaiting approval.",
        details=details,
        accent="warning",
        accent_label="Approval Needed",
        data={"teacher_request_id": str(teacher_request.id)},
    )


def notify_new_notice(notice):
    """
    A notice was published.

    Priority routing:
      - high          -> in-app notification for everyone + email to all ACTIVE students.
      - low / normal  -> in-app (push) notification only, no email.
    """
    recipients = get_notice_recipients()
    title = getattr(notice, "title", "New Notice")
    body = getattr(notice, "content", "") or getattr(notice, "description", "")
    snippet = (body[:300] + "…") if len(body) > 300 else body
    priority = str(getattr(notice, "priority", "") or "").lower()
    is_high = priority == "high"

    # Note when the notice carries attachments so recipients know to open it.
    attachment_count = 0
    try:
        attachment_count = notice.attachments.count()
    except Exception:  # noqa: BLE001
        attachment_count = 0

    body_lines = [snippet] if snippet else []
    if attachment_count:
        body_lines.append(
            f"This notice includes {attachment_count} attachment"
            f"{'s' if attachment_count != 1 else ''}."
        )

    details = [{"label": "Priority", "value": (priority or "normal").title()}]
    accent = "danger" if is_high else "info"
    accent_label = "Important Notice" if is_high else "Notice"

    # 1. In-app (push) notification for every recipient — no email here.
    notify_users(
        recipients,
        notification_type="notice_published",
        title=f"New Notice: {title}",
        message=snippet or "A new notice has been published.",
        body_lines=body_lines or None,
        details=details,
        accent=accent,
        accent_label=accent_label,
        data={"notice_id": getattr(notice, "id", None)},
        send_email=False,
    )

    # 2. High priority only -> email every active student.
    if is_high:
        students = get_active_students()
        emails = [s.email for s in students if getattr(s, "email", None)]
        if emails:
            send_branded_email(
                f"Important Notice: {title}",
                to=[],
                bcc=emails,
                heading=title,
                intro=snippet or "A new high-priority notice has been published.",
                body_lines=body_lines or None,
                details=details,
                **_accent("danger", "Important Notice"),
            )


def notify_class_routine(recipients, *, is_update=False, details=None, department_name=None):
    """A class routine was uploaded (or updated) -> notify relevant users."""
    action = "updated" if is_update else "published"
    title = "Class Routine Updated" if is_update else "New Class Routine Published"
    scope = f" for {department_name}" if department_name else ""
    notify_users(
        recipients,
        notification_type="class_routine",
        title=title,
        message=f"The class routine{scope} has been {action}. Please check the latest schedule.",
        details=details,
        accent="info",
        accent_label="Class Routine",
        data={"is_update": is_update},
    )


def notify_admission_complete(user, *, details=None):
    """A student's admission was completed/approved -> confirmation."""
    notify(
        user,
        notification_type="admission_complete",
        title="Admission Confirmed",
        message="Congratulations! Your admission has been completed successfully.",
        intro="Congratulations! Your admission process is now complete. Below are your admission details.",
        details=details,
        accent="success",
        accent_label="Admission",
        send_email=True,
    )


def notify_application_received(user, *, application_type="application", details=None):
    """A student submitted an application -> acknowledgement."""
    notify(
        user,
        notification_type="application_submitted",
        title="Application Received",
        message=f"We have received your {application_type}. Our team will review it shortly.",
        intro=f"This confirms that your {application_type} has been received and is now pending review.",
        details=details,
        accent="success",
        accent_label="Received",
        send_email=True,
    )


def notify_status_change(user, *, entity, status, notification_type="application_status",
                         details=None, extra_message=None):
    """Generic approval/rejection notification."""
    status_lower = str(status).lower()
    approved = status_lower in ("approved", "accepted", "completed", "resolved")
    accent = "success" if approved else ("danger" if status_lower in ("rejected", "declined") else "info")
    title = f"{entity} {status.title()}"
    message = extra_message or f"Your {entity.lower()} has been {status_lower}."
    notify(
        user,
        notification_type=notification_type,
        title=title,
        message=message,
        intro=message,
        details=details,
        accent=accent,
        accent_label=status.title(),
        send_email=True,
    )
