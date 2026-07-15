"""
Alumni creation services.

Shared business logic for creating an alumni record from "essential information"
only (used by both the admin manual-add flow and the student-side self-registration
flow). The core idea, per product design:

    1. Create a Student row in the background using whatever essential fields are
       available (everything except the name is optional).
    2. Immediately create the linked Alumni row and mark the student as graduated.
    3. Attach any number of documents (predefined or custom categories) using the
       existing structured file storage.

Because legacy graduates left the institute long ago, we never demand the full
admission dataset. Missing required-at-DB-level values are filled with safe,
unique placeholders.
"""
import logging
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Document categories offered for alumni uploads.
#
# Each entry maps a category *key* (sent by the frontend) to:
#   - storage_category: the standardized category understood by
#     StructuredFileStorage.DOCUMENT_CATEGORIES (falls back to 'other')
#   - label: the human Document.category value (Document.CATEGORY_CHOICES)
#
# The "custom" key lets an admin name any additional document themselves.
# ---------------------------------------------------------------------------
ALUMNI_DOCUMENT_CATEGORIES = {
    'photo': {'storage_category': 'photo', 'label': 'Photo', 'display': 'Photograph'},
    'ssc_marksheet': {'storage_category': 'ssc_marksheet', 'label': 'Marksheet', 'display': 'SSC Marksheet'},
    'ssc_certificate': {'storage_category': 'ssc_certificate', 'label': 'Certificate', 'display': 'SSC Certificate'},
    'diploma_certificate': {'storage_category': 'other', 'label': 'Certificate', 'display': 'Diploma / Final Certificate'},
    'transcript': {'storage_category': 'transcript', 'label': 'Marksheet', 'display': 'Academic Transcript'},
    'birth_certificate': {'storage_category': 'birth_certificate', 'label': 'Birth Certificate', 'display': 'Birth Certificate'},
    'nid': {'storage_category': 'nid', 'label': 'NID', 'display': 'National ID'},
    'father_nid': {'storage_category': 'father_nid', 'label': 'NID', 'display': "Father's NID"},
    'mother_nid': {'storage_category': 'mother_nid', 'label': 'NID', 'display': "Mother's NID"},
    'testimonial': {'storage_category': 'other', 'label': 'Testimonial', 'display': 'Testimonial'},
    'experience_certificate': {'storage_category': 'other', 'label': 'Certificate', 'display': 'Experience Certificate'},
    'medical_certificate': {'storage_category': 'medical_certificate', 'label': 'Medical Certificate', 'display': 'Medical Certificate'},
    'cv_resume': {'storage_category': 'other', 'label': 'Other', 'display': 'CV / Resume'},
    'other': {'storage_category': 'other', 'label': 'Other', 'display': 'Other Document'},
    'custom': {'storage_category': 'other', 'label': 'Other', 'display': 'Custom Document'},
}

# Maximum documents that may be attached to a single alumni record.
MAX_ALUMNI_DOCUMENTS = 20


def _gen_unique_identifier(prefix):
    """Generate a guaranteed-unique placeholder id (roll/registration)."""
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def _parse_int(value, default=None):
    try:
        if value is None or value == '':
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_decimal(value, default=None):
    try:
        if value is None or value == '':
            return default
        return Decimal(str(value))
    except (TypeError, ValueError, InvalidOperation):
        return default


def _parse_date(value):
    """Parse an ISO date string (YYYY-MM-DD) into a date, or None."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(str(value), fmt).date()
        except (ValueError, TypeError):
            continue
    return None


@transaction.atomic
def create_alumni_from_essentials(
    *,
    data,
    registration_source='admin_manual',
    review_status='approved',
):
    """
    Create a Student + Alumni pair from essential information only.

    Args:
        data: dict of submitted fields. Recognised keys (all optional except
              fullNameEnglish and department):
                fullNameEnglish, fullNameBangla, fatherName, motherName,
                fatherNID, motherNID, dateOfBirth, gender, religion, bloodGroup,
                nationality, mobileStudent, guardianMobile, email,
                emergencyContact, presentAddress, permanentAddress,
                department (id), session, shift, currentGroup,
                rollNumber, registrationNumber, currentRollNumber,
                currentRegistrationNumber, board, group, passingYear, gpa,
                institutionName, semesterResults (list),
                graduationYear, alumniType, currentSupportCategory, bio,
                linkedinUrl, portfolioUrl, currentPosition
        registration_source: one of Alumni.REGISTRATION_SOURCE_CHOICES.
        review_status: one of Alumni.REVIEW_STATUS_CHOICES.

    Returns:
        The created Alumni instance.

    Raises:
        ValueError: on missing/invalid essential fields (name, department).
    """
    from apps.students.models import Student
    from apps.departments.models import Department
    from .models import Alumni

    full_name_english = (data.get('fullNameEnglish') or '').strip()
    if not full_name_english:
        raise ValueError('Full name (English) is required.')

    department_id = data.get('department') or data.get('departmentId')
    if not department_id:
        raise ValueError('Department is required.')
    try:
        department = Department.objects.get(pk=department_id)
    except Department.DoesNotExist:
        raise ValueError('Selected department does not exist.')

    graduation_year = _parse_int(data.get('graduationYear')) or _parse_int(data.get('passingYear'))

    # currentRollNumber / currentRegistrationNumber are unique + NOT NULL.
    # Use the admin-provided value when present, otherwise a unique placeholder.
    current_roll = (data.get('currentRollNumber') or '').strip() or _gen_unique_identifier('ALM')
    current_reg = (data.get('currentRegistrationNumber') or '').strip() or _gen_unique_identifier('ALMREG')

    semester_results = data.get('semesterResults') or []
    if not isinstance(semester_results, list):
        semester_results = []

    present_address = data.get('presentAddress') or {}
    permanent_address = data.get('permanentAddress') or {}

    student = Student(
        fullNameEnglish=full_name_english,
        fullNameBangla=(data.get('fullNameBangla') or '').strip(),
        fatherName=(data.get('fatherName') or '').strip(),
        motherName=(data.get('motherName') or '').strip(),
        fatherNID=(data.get('fatherNID') or '').strip(),
        motherNID=(data.get('motherNID') or '').strip(),
        dateOfBirth=_parse_date(data.get('dateOfBirth')),
        birthCertificateNo=(data.get('birthCertificateNo') or '').strip(),
        nidNumber=(data.get('nidNumber') or '').strip(),
        gender=(data.get('gender') or '').strip(),
        religion=(data.get('religion') or '').strip(),
        bloodGroup=(data.get('bloodGroup') or '').strip(),
        nationality=(data.get('nationality') or 'Bangladeshi').strip(),
        maritalStatus=(data.get('maritalStatus') or '').strip(),
        mobileStudent=(data.get('mobileStudent') or '').strip(),
        guardianMobile=(data.get('guardianMobile') or '').strip(),
        email=(data.get('email') or '').strip(),
        emergencyContact=(data.get('emergencyContact') or '').strip(),
        presentAddress=present_address if isinstance(present_address, dict) else {},
        permanentAddress=permanent_address if isinstance(permanent_address, dict) else {},
        highestExam=(data.get('highestExam') or '').strip(),
        board=(data.get('board') or '').strip(),
        group=(data.get('group') or '').strip(),
        rollNumber=(data.get('rollNumber') or '').strip(),
        registrationNumber=(data.get('registrationNumber') or '').strip(),
        passingYear=_parse_int(data.get('passingYear')),
        gpa=_parse_decimal(data.get('gpa')),
        institutionName=(data.get('institutionName') or '').strip(),
        currentRollNumber=current_roll,
        currentRegistrationNumber=current_reg,
        semester=8,  # graduated => completed final semester
        department=department,
        session=(data.get('session') or '').strip(),
        shift=(data.get('shift') or '').strip(),
        currentGroup=(data.get('currentGroup') or '').strip(),
        status='graduated',
        enrollmentDate=_parse_date(data.get('enrollmentDate')),
        semesterResults=semester_results,
    )
    student.save()

    alumni = Alumni.objects.create(
        student=student,
        alumniType=data.get('alumniType') or 'established',
        graduationYear=graduation_year,
        currentSupportCategory=data.get('currentSupportCategory') or 'no_support_needed',
        currentPosition=data.get('currentPosition') or None,
        bio=(data.get('bio') or '').strip() or None,
        linkedinUrl=(data.get('linkedinUrl') or '').strip() or None,
        portfolioUrl=(data.get('portfolioUrl') or '').strip() or None,
        registrationSource=registration_source,
        reviewStatus=review_status,
        isVerified=(review_status == 'approved' and registration_source != 'self_registration'),
        lastEditedBy='admin' if registration_source == 'admin_manual' else 'student',
    )

    alumni.supportHistory = [{
        'date': timezone.now().isoformat(),
        'previousCategory': None,
        'newCategory': alumni.currentSupportCategory,
        'notes': f'Alumni created via {registration_source}',
    }]
    alumni.save()

    logger.info(
        "Alumni created (source=%s, review=%s) student=%s grad_year=%s",
        registration_source, review_status, student.id, graduation_year,
    )
    return alumni


def create_portal_account_for_alumni(alumni, *, email=None, password=None, actor=None):
    """
    Create the portal login for an alumnus (admin "Create Portal Account").

    A thin adapter over the ONE implementation in
    `apps.students.account_service` — the same code the Student details page
    uses. Only the alumni-specific policy lives here: the password may be
    auto-generated so the admin can read it out to the alumnus.

    Returns:
        dict: { 'user', 'username', 'password', 'email' } — `password` is only
        set when it was auto-generated.

    Raises:
        ValueError: if an account is already linked, or no email is available.
    """
    from apps.students.account_service import AccountError, create_student_portal_account

    try:
        result = create_student_portal_account(
            alumni.student,
            email=email,
            password=password,
            generate_password=True,   # the alumni flow may mint one
            actor=actor,
        )
    except AccountError as exc:
        # Callers here expect a plain ValueError (the view maps it to a 400).
        raise ValueError(exc.detail or exc.message) from exc

    return {
        'user': result['user'],
        'username': result['username'],
        'password': result['generated_password'],
        'email': result['email'],
    }


def compute_profile_completion(alumni):
    """
    Server-side mirror of the frontend `getProfileCompletion` scoring so the
    admin email/reminder tooling and the alumni UI stay in agreement.

    Returns:
        dict: {
            'percentage': int (0-100),
            'completed': int,
            'total': int,
            'missing': [str labels...],
        }
    """
    student = alumni.student

    def _has(value):
        return bool(value and str(value).strip() and str(value).strip() != 'N/A')

    address = student.presentAddress if isinstance(student.presentAddress, dict) else {}

    items = [
        ('Profile photo', _has(student.profilePhoto)),
        ('About / bio', _has(alumni.bio)),
        ('Contact details', _has(student.email) and _has(student.mobileStudent)),
        ('Current location', _has(address.get('district'))),
        ('A career or study entry', len(alumni.careerHistory or []) > 0),
        ('At least 3 skills', len(alumni.skills or []) >= 3),
        ('A course or certification', len(alumni.courses or []) > 0),
        ('A career highlight', len(alumni.highlights or []) > 0),
        ('LinkedIn or portfolio link', _has(alumni.linkedinUrl) or _has(alumni.portfolioUrl)),
    ]

    completed = sum(1 for _, done in items if done)
    total = len(items)
    percentage = round((completed / total) * 100) if total else 0

    return {
        'percentage': percentage,
        'completed': completed,
        'total': total,
        'missing': [label for label, done in items if not done],
    }


def get_alumni_account_email(alumni):
    """
    Preferred contact email for an alumnus: the email on their login account
    (the address they registered/were created with), falling back to the email
    stored on the student record. Returns '' when neither is set.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.filter(related_profile_id=alumni.student_id).first()
    account_email = (user.email if user else '') or ''
    return (account_email or alumni.student.email or '').strip()


def send_profile_completion_reminder(alumni, completion=None, *, from_email=None):
    """
    Email a single alumnus (at their account email) asking them to finish their
    profile — a branded, bilingual (English + Bangla) request explaining why
    their information matters.

    Returns True when an email was dispatched, False when skipped (no email on
    file, or the user disabled email notifications).
    """
    from apps.notifications.email_service import send_branded_email
    from apps.notifications.dispatch import student_portal_url

    student = alumni.student
    recipient = get_alumni_account_email(alumni)
    if not recipient:
        return False

    completion = completion or compute_profile_completion(alumni)
    name = student.fullNameEnglish or 'there'
    missing = completion['missing'] or ['A few finishing touches']

    sections = [
        {
            "title": "Why complete your information? / কেন তথ্য পূরণ করবেন?",
            "bullets": [
                "It keeps you connected — the institute can reach you with reunions, events and opportunities relevant to your batch.",
                "It strengthens the alumni network — fellow graduates can find you in the Alumni Directory.",
                "এটি আপনাকে যুক্ত রাখে — পুনর্মিলনী, ইভেন্ট ও আপনার ব্যাচের জন্য প্রাসঙ্গিক সুযোগের খবর ইনস্টিটিউট আপনাকে জানাতে পারবে।",
                "এটি অ্যালামনাই নেটওয়ার্ককে শক্তিশালী করে — সহপাঠীরা অ্যালামনাই ডিরেক্টরিতে আপনাকে খুঁজে পাবেন।",
            ],
        },
        {
            "title": "How your information helps the institute / আপনার তথ্য কীভাবে ইনস্টিটিউটকে সাহায্য করে",
            "bullets": [
                "Success stories of graduates like you inspire and guide current students.",
                "Accurate alumni records help the institute plan programs, mentorship and career support.",
                "আপনার মতো গ্র্যাজুয়েটদের সাফল্যের গল্প বর্তমান শিক্ষার্থীদের অনুপ্রাণিত করে ও পথ দেখায়।",
                "সঠিক অ্যালামনাই তথ্য ইনস্টিটিউটকে বিভিন্ন প্রোগ্রাম, মেন্টরশিপ ও ক্যারিয়ার সহায়তা পরিকল্পনায় সাহায্য করে।",
            ],
        },
        {
            "title": "Still missing from your profile / আপনার প্রোফাইলে যা এখনো বাকি",
            "bullets": list(missing),
        },
    ]

    return send_branded_email(
        'Please complete your alumni profile — SIPI Alumni Office',
        recipient,
        heading='Help us keep your alumni record complete',
        greeting=f"Dear {name}, / প্রিয় {name},",
        intro=(
            f"Your alumni profile is currently {completion['percentage']}% complete. "
            "Completing it takes only a few minutes, and your participation is truly "
            "valuable to the SIPI community. "
            f"আপনার অ্যালামনাই প্রোফাইল বর্তমানে {completion['percentage']}% সম্পূর্ণ — "
            "বাকি তথ্য পূরণ করতে মাত্র কয়েক মিনিট লাগবে।"
        ),
        sections=sections,
        cta_label='Complete my profile / প্রোফাইল সম্পূর্ণ করুন',
        cta_url=student_portal_url('/dashboard/alumni-profile'),
        closing=(
            "Thank you for being a proud part of the SIPI family. / "
            "সিপির পরিবারের গর্বিত সদস্য হিসেবে আপনাকে ধন্যবাদ। — Alumni Office, Sirajganj Polytechnic Institute"
        ),
        accent_label='Alumni',
        accent_color='#0f766e',
        accent_soft='#f0fdfa',
        async_send=False,  # caller records per-recipient success/failure
    )


def attach_alumni_documents(alumni, document_items):
    """
    Save and register a batch of documents for an alumni record.

    Args:
        alumni: Alumni instance.
        document_items: iterable of dicts with keys:
            - file: the UploadedFile
            - category: a key in ALUMNI_DOCUMENT_CATEGORIES (e.g. 'photo',
              'ssc_certificate', 'custom', 'other')
            - custom_name: human label, required/used when category is 'custom'

    Returns:
        dict: { 'created': [document ids...], 'errors': [str...] }
    """
    from django.core.exceptions import ValidationError
    from utils.structured_file_storage import structured_storage
    from apps.documents.models import Document

    student = alumni.student
    department = student.department

    existing_count = Document.objects.filter(
        student=student, document_type='alumni', status='active'
    ).count()

    alumni_data = {
        'department_code': (department.code or 'unknown').lower().replace(' ', '-'),
        'department_name': (department.name or '').lower().replace(' ', '-'),
        'graduation_year': str(alumni.graduationYear or 'unknown'),
        'alumni_name': (student.fullNameEnglish or 'alumni').replace(' ', ''),
        'alumni_id': student.currentRollNumber or str(student.id)[:8],
    }

    created = []
    errors = []

    for item in document_items:
        uploaded_file = item.get('file')
        if not uploaded_file:
            continue

        if existing_count + len(created) >= MAX_ALUMNI_DOCUMENTS:
            errors.append(f'Document limit ({MAX_ALUMNI_DOCUMENTS}) reached; some files were skipped.')
            break

        category_key = item.get('category') or 'other'
        config = ALUMNI_DOCUMENT_CATEGORIES.get(category_key, ALUMNI_DOCUMENT_CATEGORIES['other'])
        custom_name = (item.get('custom_name') or '').strip()
        storage_category = config['storage_category']
        label = config['label']
        display = custom_name if (category_key == 'custom' and custom_name) else config['display']

        try:
            file_info = structured_storage.save_alumni_document(
                uploaded_file=uploaded_file,
                alumni_data=alumni_data,
                document_category=storage_category,
                validate=True,
            )

            document = Document.objects.create(
                student=student,
                fileName=file_info['file_name'],
                fileType=file_info['file_type'],
                category=label,
                filePath=file_info['file_path'],
                fileSize=file_info['file_size'],
                fileHash=file_info['file_hash'],
                mimeType=file_info['mime_type'],
                source_type='manual',
                source_id=student.id,
                original_field_name=category_key,
                description=display,
                status='active',
                document_type='alumni',
                department_code=file_info.get('department_code', ''),
                session='',
                shift='',
                owner_name=file_info.get('owner_name', ''),
                owner_id=file_info.get('owner_id', ''),
                document_category=file_info.get('document_category', 'other'),
                metadata={'alumni_category': category_key, 'display_name': display},
            )
            created.append(str(document.id))
            logger.info("Alumni document saved: %s (%s)", document.id, category_key)
        except ValidationError as exc:
            errors.append(f'{display}: {exc.messages[0] if exc.messages else str(exc)}')
        except Exception as exc:  # noqa: BLE001 - collect per-file errors like admission flow
            logger.exception("Failed to save alumni document %s", category_key)
            errors.append(f'{display}: {str(exc)}')

    return {'created': created, 'errors': errors}
