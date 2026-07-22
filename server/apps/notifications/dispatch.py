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

from django.conf import settings
from django.contrib.auth import get_user_model

from .services import NotificationService
from .email_service import send_branded_email

logger = logging.getLogger(__name__)
User = get_user_model()


def student_portal_url(path=""):
    """Absolute Student Portal URL for email CTAs."""
    base = getattr(settings, 'STUDENT_PORTAL_URL', 'https://spisg.gov.bd')
    return f"{base}{path}"


def admin_portal_url(path=""):
    """Absolute Admin Portal URL for email CTAs."""
    base = getattr(settings, 'ADMIN_PORTAL_URL', 'https://su.spisg.gov.bd')
    return f"{base}{path}"

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
           highlight=None, cta_label=None, cta_url=None, subject=None, intro=None,
           sections=None, closing=None):
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
            sections=sections,
            details=details,
            highlight=highlight,
            cta_label=cta_label,
            cta_url=cta_url,
            closing=closing,
            **_accent(accent, accent_label),
        )


def notify_users(users, *, notification_type, title, message, data=None,
                 accent="info", accent_label=None, details=None, body_lines=None,
                 subject=None, intro=None, send_email=True, sections=None,
                 cta_label=None, cta_url=None, closing=None):
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
                sections=sections,
                details=details,
                cta_label=cta_label,
                cta_url=cta_url,
                closing=closing,
                **_accent(accent, accent_label),
            )


# ---------------------------------------------------------------------------
# Specific events
# ---------------------------------------------------------------------------

def _student_welcome_sections(user):
    """
    Detailed bilingual (English + Bangla) guidance for a new Student Portal
    account, tailored to where the user is in their journey.
    """
    is_alumni_account = bool(getattr(user, "is_alumni_account", False))
    needs_admission = (not is_alumni_account) and getattr(
        user, "admission_status", "not_started"
    ) in ("not_started", "pending", "rejected")

    sections = []

    if is_alumni_account:
        sections.append({
            "title": "What to do next / পরবর্তী করণীয়",
            "bullets": [
                "Sign in to the Student Portal and open your Alumni Profile.",
                "Complete the alumni registration form with your batch, department and current occupation.",
                "Keep your contact details up to date so the institute and fellow alumni can reach you.",
                "সাইন ইন করে আপনার অ্যালামনাই প্রোফাইল সম্পূর্ণ করুন — ব্যাচ, ডিপার্টমেন্ট ও বর্তমান পেশার তথ্য দিন।",
                "আপনার যোগাযোগের তথ্য হালনাগাদ রাখুন, যাতে ইনস্টিটিউট ও সহপাঠীরা আপনার সাথে যোগাযোগ করতে পারে।",
            ],
        })
    elif needs_admission:
        sections.append({
            "title": "What to do next / পরবর্তী করণীয়",
            "bullets": [
                "Sign in to the Student Portal with this email address.",
                "Open the “Admission” section from the dashboard menu and fill in the online admission form step by step.",
                "Upload the required documents and submit the form — you will receive a confirmation email once it is received.",
                "এই ইমেইল ঠিকানা দিয়ে স্টুডেন্ট পোর্টালে সাইন ইন করুন।",
                "ড্যাশবোর্ডের মেনু থেকে “Admission” অংশে গিয়ে অনলাইন ভর্তি ফরমটি ধাপে ধাপে পূরণ করুন।",
                "প্রয়োজনীয় কাগজপত্র আপলোড করে ফরম জমা দিন — জমা হলে আপনি একটি নিশ্চিতকরণ ইমেইল পাবেন।",
            ],
        })
        sections.append({
            "title": "Documents to prepare before admission / ভর্তির আগে যেসব কাগজপত্র প্রস্তুত রাখবেন",
            "bullets": [
                "Recent passport-size photograph / সাম্প্রতিক পাসপোর্ট সাইজের ছবি",
                "SSC marksheet and certificate / এসএসসি মার্কশিট ও সনদপত্র",
                "Birth certificate / জন্ম নিবন্ধন সনদ",
                "Father's NID (both sides) / বাবার জাতীয় পরিচয়পত্র (উভয় পাশ)",
                "Mother's NID (both sides) / মায়ের জাতীয় পরিচয়পত্র (উভয় পাশ)",
                "Your and your guardian's active mobile numbers / আপনার ও অভিভাবকের সচল মোবাইল নম্বর",
            ],
        })
        sections.append({
            "title": "Admission process / ভর্তি প্রক্রিয়া",
            "bullets": [
                "Submit the admission form → the institute reviews your application → you are notified of approval by email and in the portal.",
                "ভর্তি ফরম জমা দিন → ইনস্টিটিউট আপনার আবেদন যাচাই করবে → অনুমোদনের খবর ইমেইল ও পোর্টালের মাধ্যমে জানানো হবে।",
            ],
        })
    else:
        sections.append({
            "title": "What to do next / পরবর্তী করণীয়",
            "bullets": [
                "Sign in to the Student Portal with this email address.",
                "Explore your dashboard — class routine, attendance, marks, documents and notices are all available there.",
                "এই ইমেইল ঠিকানা দিয়ে স্টুডেন্ট পোর্টালে সাইন ইন করুন।",
                "ড্যাশবোর্ড ঘুরে দেখুন — ক্লাস রুটিন, উপস্থিতি, ফলাফল, ডকুমেন্ট ও নোটিশ সবকিছু সেখানে পাবেন।",
            ],
        })

    sections.append({
        "title": "How you will receive updates / আপডেট যেভাবে পাবেন",
        "bullets": [
            "Important notices and announcements arrive by email and in the portal's “Notices & Updates” section.",
            "You can manage email preferences from Settings (security codes are always delivered).",
            "গুরুত্বপূর্ণ নোটিশ ও ঘোষণা ইমেইলে এবং পোর্টালের “Notices & Updates” অংশে পাবেন।",
            "Settings থেকে ইমেইল নোটিফিকেশন নিয়ন্ত্রণ করতে পারবেন (নিরাপত্তা কোড সবসময় পাঠানো হয়)।",
        ],
    })
    sections.append({
        "title": "Facing a problem? / সমস্যায় পড়লে",
        "lines": [
            "If you face any problem signing in or completing a step, contact the institute office using the email or phone number given at the bottom of this message.",
            "সাইন ইন বা কোনো ধাপ সম্পন্ন করতে সমস্যা হলে এই ইমেইলের নিচে দেওয়া ইমেইল ঠিকানা বা ফোন নম্বরে ইনস্টিটিউট অফিসে যোগাযোগ করুন।",
        ],
    })
    return sections


def send_welcome_email(user, *, portal="admin", role_label=None, details=None):
    """Welcome a newly-created account (admin or student) with detailed,
    bilingual (English + Bangla) next-step guidance."""
    portal_name = "Admin Portal" if portal == "admin" else "Student Portal"
    title = f"Welcome to SIPI {portal_name}"
    message = (
        f"Your {portal_name} account has been created successfully. "
        "You can now sign in and start using the system."
    )
    rows = details or []
    if role_label:
        rows = [{"label": "Role", "value": role_label}] + rows

    if portal == "admin":
        sections = [{
            "title": "Getting started",
            "bullets": [
                "Sign in to the Admin Portal with your username and password.",
                "Review your profile in Settings and upload your signature if you approve documents.",
                "Enable two-factor authentication from Settings → Security for extra account protection.",
            ],
        }]
        cta_url = admin_portal_url()
        cta_label = "Open the Admin Portal"
        intro = f"Welcome aboard! {message}"
    else:
        sections = _student_welcome_sections(user)
        cta_url = student_portal_url()
        cta_label = "Open the Student Portal"
        intro = (
            "Welcome to the Sirajganj Polytechnic Institute Student Portal! "
            "আপনার অ্যাকাউন্টটি সফলভাবে তৈরি হয়েছে। "
            "Below you will find everything you need to get started — in English and in Bangla."
        )

    notify(
        user,
        notification_type="welcome",
        title=title,
        message=message,
        accent="success",
        accent_label="Welcome",
        intro=intro,
        sections=sections,
        details=rows or None,
        cta_label=cta_label,
        cta_url=cta_url,
        closing="We are glad to have you with us. / আপনাকে আমাদের সাথে পেয়ে আমরা আনন্দিত।",
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


# Attachments up to this combined size are attached to the notice email
# itself; anything above is delivered as download links only.
MAX_EMAIL_ATTACHMENT_BYTES = 8 * 1024 * 1024


def _notice_attachment_payload(notice, request=None):
    """
    Build (attachment_links, attachments) for a notice's uploaded files.

    attachment_links: [{"name", "url"}] with absolute URLs when a request is
        available (or when the file storage already returns absolute URLs).
    attachments: [(filename, content, mimetype)] for files small enough to be
        attached to the email directly.
    """
    import mimetypes

    links, files, total = [], [], 0
    try:
        for att in notice.attachments.all():
            if not att.file:
                continue
            name = att.original_name or att.file.name.rsplit("/", 1)[-1]
            try:
                url = att.file.url
                if request is not None:
                    url = request.build_absolute_uri(url)
                links.append({"name": name, "url": url})
            except Exception:  # noqa: BLE001
                pass
            try:
                size = att.file.size or 0
                if total + size <= MAX_EMAIL_ATTACHMENT_BYTES:
                    with att.file.open("rb") as fh:
                        content = fh.read()
                    mimetype = mimetypes.guess_type(name)[0] or "application/octet-stream"
                    files.append((name, content, mimetype))
                    total += size
            except Exception as exc:  # noqa: BLE001
                logger.error("Could not read notice attachment %s: %s", att.pk, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("Could not collect notice attachments: %s", exc)
    return links, files


def notify_new_notice(notice, request=None, recipients=None):
    """
    A notice was published.

    `recipients` is the audience-targeted user queryset/list resolved by
    apps.notices.targeting. When omitted (legacy callers) it falls back to
    the historical default: every active student, captain and teacher.

    Priority routing:
      - high          -> in-app notification for recipients + email. For the
                         default students+teachers audience only students are
                         emailed (historical behavior); for every other
                         audience all targeted recipients are emailed.
      - low / normal  -> in-app (push) notification only, no email.

    Notice emails include the uploaded PDF/image attachments (attached to the
    email when small enough, and always as download links).
    """
    recipients = list(recipients) if recipients is not None else list(get_notice_recipients())
    title = getattr(notice, "title", "New Notice")
    body = getattr(notice, "content", "") or getattr(notice, "description", "")
    snippet = (body[:300] + "…") if len(body) > 300 else body
    priority = str(getattr(notice, "priority", "") or "").lower()
    is_high = priority == "high"

    attachment_links, attachment_files = _notice_attachment_payload(notice, request)
    attachment_count = len(attachment_links)

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

    # 2. High priority only -> email the targeted recipients, with attachments.
    # For the default students+teachers audience, keep the historical
    # behavior of emailing students only.
    if is_high:
        audience = str(getattr(notice, "audience", "") or "students_teachers")
        if audience == "students_teachers":
            email_users = [u for u in recipients if getattr(u, "role", "") in ("student", "captain")]
        else:
            email_users = recipients
        emails = [u.email for u in email_users if getattr(u, "email", None)]
        if emails:
            send_branded_email(
                f"Important Notice: {title}",
                to=[],
                bcc=emails,
                heading=title,
                intro=snippet or "A new high-priority notice has been published.",
                body_lines=body_lines or None,
                sections=[{
                    "title": "What you should do / আপনার করণীয়",
                    "bullets": [
                        "Read the full notice in the Student Portal — attachments can be viewed and downloaded there as well.",
                        "স্টুডেন্ট পোর্টালে সম্পূর্ণ নোটিশটি পড়ুন — সংযুক্ত ফাইলগুলোও সেখানে দেখা ও ডাউনলোড করা যাবে।",
                    ],
                }],
                details=details,
                attachment_links=attachment_links or None,
                attachments=attachment_files or None,
                cta_label="View notice in the portal",
                cta_url=student_portal_url("/dashboard/notices"),
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
        sections=[{
            "title": "What you should do / আপনার করণীয়",
            "bullets": [
                "Open the “Class Routine” section of the Student Portal to see your updated schedule.",
                "Note any changes to class times or rooms before your next class day.",
                "স্টুডেন্ট পোর্টালের “Class Routine” অংশ থেকে আপনার নতুন রুটিন দেখে নিন।",
                "পরবর্তী ক্লাসের আগে সময় বা কক্ষ পরিবর্তন হয়েছে কি না লক্ষ্য করুন।",
            ],
        }],
        details=details,
        accent="info",
        accent_label="Class Routine",
        cta_label="View class routine",
        cta_url=student_portal_url("/dashboard/routine"),
        data={"is_update": is_update},
    )


def notify_admission_complete(user, *, details=None):
    """A student's admission was completed/approved -> confirmation."""
    notify(
        user,
        notification_type="admission_complete",
        title="Admission Confirmed",
        message="Congratulations! Your admission has been completed successfully.",
        intro=(
            "Congratulations! Your admission process is now complete and you are officially "
            "a student of Sirajganj Polytechnic Institute. অভিনন্দন! আপনার ভর্তি প্রক্রিয়া "
            "সম্পন্ন হয়েছে। Below are your admission details."
        ),
        sections=[{
            "title": "What happens next / এরপর যা হবে",
            "bullets": [
                "Sign in to the Student Portal — your class routine, attendance and notices are now available.",
                "Keep an eye on “Notices & Updates” for orientation and class start announcements.",
                "Bring the original copies of your submitted documents when the institute asks for verification.",
                "স্টুডেন্ট পোর্টালে সাইন ইন করুন — ক্লাস রুটিন, উপস্থিতি ও নোটিশ এখন সেখানে পাবেন।",
                "ওরিয়েন্টেশন ও ক্লাস শুরুর ঘোষণার জন্য “Notices & Updates” দেখতে থাকুন।",
                "যাচাইয়ের প্রয়োজনে ইনস্টিটিউট চাইলে জমা দেওয়া কাগজপত্রের মূল কপি সাথে আনবেন।",
            ],
        }],
        details=details,
        accent="success",
        accent_label="Admission",
        cta_label="Open the Student Portal",
        cta_url=student_portal_url(),
        send_email=True,
    )


def notify_application_received(user, *, application_type="application", details=None):
    """A student submitted an application -> acknowledgement."""
    notify(
        user,
        notification_type="application_submitted",
        title="Application Received",
        message=f"We have received your {application_type}. Our team will review it shortly.",
        intro=(
            f"This confirms that your {application_type} has been received and is now pending review. "
            "আপনার আবেদনটি গৃহীত হয়েছে এবং পর্যালোচনার অপেক্ষায় আছে।"
        ),
        sections=[{
            "title": "What happens next / এরপর যা হবে",
            "bullets": [
                "The relevant office will review your submission — no further action is needed from you right now.",
                "You will be notified by email and in the portal as soon as a decision is made.",
                "You can check the current status any time from the “Applications” section of the portal.",
                "সংশ্লিষ্ট দপ্তর আপনার আবেদন পর্যালোচনা করবে — এই মুহূর্তে আপনার আর কিছু করার প্রয়োজন নেই।",
                "সিদ্ধান্ত হওয়া মাত্র ইমেইল ও পোর্টালের মাধ্যমে আপনাকে জানানো হবে।",
            ],
        }],
        details=details,
        accent="success",
        accent_label="Received",
        cta_label="Track my application",
        cta_url=student_portal_url("/dashboard/applications"),
        send_email=True,
    )


def notify_status_change(user, *, entity, status, notification_type="application_status",
                         details=None, extra_message=None):
    """Generic approval/rejection notification."""
    status_lower = str(status).lower()
    approved = status_lower in ("approved", "accepted", "completed", "resolved")
    rejected = status_lower in ("rejected", "declined")
    accent = "success" if approved else ("danger" if rejected else "info")
    title = f"{entity} {status.title()}"
    message = extra_message or f"Your {entity.lower()} has been {status_lower}."

    if approved:
        guidance = [
            "No further action is required unless the institute contacts you with additional instructions.",
            "You can see the full details in the Student Portal.",
            "ইনস্টিটিউট থেকে ভিন্ন নির্দেশনা না এলে আপনার আর কিছু করার প্রয়োজন নেই।",
        ]
    elif rejected:
        guidance = [
            "Please review the reason provided (if any) in the details above or in the portal.",
            "If you believe this is a mistake, or need clarification, contact the institute office — contact details are at the bottom of this email.",
            "কোনো কারণ উল্লেখ থাকলে তা দেখে নিন; ভুল মনে হলে ইনস্টিটিউট অফিসে যোগাযোগ করুন।",
        ]
    else:
        guidance = [
            "You can view the latest status and any remarks in the Student Portal.",
            "সর্বশেষ অবস্থা ও মন্তব্য স্টুডেন্ট পোর্টালে দেখতে পারবেন।",
        ]

    notify(
        user,
        notification_type=notification_type,
        title=title,
        message=message,
        intro=message,
        sections=[{"title": "What this means for you / আপনার জন্য এর অর্থ", "bullets": guidance}],
        details=details,
        accent=accent,
        accent_label=status.title(),
        cta_label="Open the Student Portal",
        cta_url=student_portal_url(),
        send_email=True,
    )
