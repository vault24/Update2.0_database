"""
Alumni import — field mapping configuration.

THIS IS THE ONLY FILE YOU NEED TO EDIT to change what a spreadsheet may
contain. Everything else (the parser, the validator, the API documentation
endpoint and the admin "Column Reference" UI) is generated from the
FIELD_SPECS list below, so a new column never requires touching the import
service or the frontend.

To add a field:
    1. Append a FieldSpec to FIELD_SPECS.
    2. Nothing else. It is immediately importable, documented in the UI and
       included in the downloadable column template.

Key concepts
------------
* ``key``     Where the value lands. Dotted keys build nested JSON
              (``presentAddress.district`` -> {"presentAddress": {"district": ...}}).
              These keys are exactly what ``create_alumni_from_essentials``
              already understands, which is why one import writes to BOTH the
              Student and Alumni tables in a single operation.
* ``target``  Which table the value ultimately belongs to ('student' or
              'alumni'). Purely informational — it drives the documentation UI
              so admins can see that e.g. "Father Name" is preserved on the
              Student record even though they are importing alumni.
* ``aliases`` Accepted spreadsheet headers. Matching is case-, space- and
              punctuation-insensitive, so "Father's Name", "father name" and
              "FATHER NAME" all resolve to the same field.
"""
from dataclasses import dataclass, field as dc_field
from typing import Tuple
import re


# --- Value types understood by the import service ---------------------------
TYPE_STRING = 'string'
TYPE_INT = 'int'
TYPE_DECIMAL = 'decimal'
TYPE_DATE = 'date'
TYPE_EMAIL = 'email'
TYPE_CHOICE = 'choice'
TYPE_DEPARTMENT = 'department'   # resolved against the Department table

TARGET_STUDENT = 'student'
TARGET_ALUMNI = 'alumni'


@dataclass(frozen=True)
class FieldSpec:
    key: str
    label: str
    recommended: str
    target: str = TARGET_STUDENT
    aliases: Tuple[str, ...] = ()
    required: bool = False
    type: str = TYPE_STRING
    example: str = ''
    choices: Tuple[str, ...] = ()
    help_text: str = ''

    @property
    def group(self) -> str:
        """Documentation grouping (derived from the target table)."""
        return 'Alumni record' if self.target == TARGET_ALUMNI else 'Student record'


# ---------------------------------------------------------------------------
# The field catalogue.
#
# Required = the minimum an alumni record cannot exist without. Everything else
# is optional and silently skipped when the column is absent.
# ---------------------------------------------------------------------------
FIELD_SPECS: Tuple[FieldSpec, ...] = (
    # ---------------- Required ----------------
    FieldSpec(
        key='fullNameEnglish', label='Full Name (English)', recommended='Name',
        aliases=('Student Name', 'Full Name', 'Name English', 'Full Name English',
                 'Alumni Name', 'English Name'),
        required=True, example='Md Mahadi Hasan',
        help_text='The only personal detail that is always required.',
    ),
    FieldSpec(
        key='department', label='Department', recommended='Department',
        aliases=('Dept', 'Department Name', 'Department Code', 'Dept Name', 'Technology'),
        required=True, type=TYPE_DEPARTMENT, example='Computer Science & Technology',
        help_text='Matched against department name or code (case-insensitive).',
    ),

    # ---------------- Identity ----------------
    FieldSpec(
        key='fullNameBangla', label='Full Name (Bangla)', recommended='Name (Bangla)',
        aliases=('Bangla Name', 'Name Bangla', 'Full Name Bangla'),
        example='মোঃ মাহাদী হাসান',
    ),
    FieldSpec(
        key='fatherName', label="Father's Name", recommended='Father Name',
        aliases=('F Name', "Father's Name", 'Fathers Name', 'Father'),
        example='Abdul Karim',
    ),
    FieldSpec(
        key='motherName', label="Mother's Name", recommended='Mother Name',
        aliases=('M Name', "Mother's Name", 'Mothers Name', 'Mother'),
        example='Fatema Begum',
    ),
    FieldSpec(
        key='fatherNID', label="Father's NID", recommended='Father NID',
        aliases=("Father's NID", 'Fathers NID', 'F NID'), example='1234567890',
    ),
    FieldSpec(
        key='motherNID', label="Mother's NID", recommended='Mother NID',
        aliases=("Mother's NID", 'Mothers NID', 'M NID'), example='0987654321',
    ),
    FieldSpec(
        key='nidNumber', label='NID Number', recommended='NID',
        aliases=('NID Number', 'National ID', 'NID No'), example='1990123456789',
    ),
    FieldSpec(
        key='birthCertificateNo', label='Birth Certificate No.', recommended='Birth Certificate',
        aliases=('Birth Certificate No', 'Birth Reg No', 'Birth Registration'),
        example='19901234567890123',
    ),
    FieldSpec(
        key='dateOfBirth', label='Date of Birth', recommended='Date of Birth',
        aliases=('DOB', 'Birth Date', 'Birthday', 'D.O.B'),
        type=TYPE_DATE, example='1998-05-21',
        help_text='Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY or a real Excel date cell.',
    ),
    FieldSpec(
        key='gender', label='Gender', recommended='Gender',
        aliases=('Sex',), type=TYPE_CHOICE, choices=('Male', 'Female', 'Other'),
        example='Male',
    ),
    FieldSpec(
        key='religion', label='Religion', recommended='Religion', example='Islam',
    ),
    FieldSpec(
        key='bloodGroup', label='Blood Group', recommended='Blood Group',
        aliases=('Blood', 'Blood Grp'), example='B+',
    ),
    FieldSpec(
        key='nationality', label='Nationality', recommended='Nationality',
        example='Bangladeshi',
    ),
    FieldSpec(
        key='maritalStatus', label='Marital Status', recommended='Marital Status',
        aliases=('Marital',), example='Single',
    ),

    # ---------------- Contact ----------------
    FieldSpec(
        key='mobileStudent', label='Mobile', recommended='Mobile',
        aliases=('Phone', 'Mobile Number', 'Phone Number', 'Contact', 'Cell',
                 'Contact Number', 'Mobile No'),
        example='01712345678',
    ),
    FieldSpec(
        key='guardianMobile', label='Guardian Mobile', recommended='Guardian Mobile',
        aliases=('Guardian Phone', 'Guardian Contact', 'Guardian Number'),
        example='01812345678',
    ),
    FieldSpec(
        key='email', label='Email', recommended='Email',
        aliases=('Email Address', 'E-mail', 'Mail', 'E Mail'),
        type=TYPE_EMAIL, example='mahadi@example.com',
    ),
    FieldSpec(
        key='emergencyContact', label='Emergency Contact', recommended='Emergency Contact',
        aliases=('Emergency', 'Emergency Number'), example='01912345678',
    ),

    # ---------------- Address (nested JSON) ----------------
    FieldSpec(
        key='presentAddress.fullAddress', label='Present Address', recommended='Present Address',
        aliases=('Address', 'Current Address'), example='House 12, Road 3, Sirajganj',
    ),
    FieldSpec(
        key='presentAddress.district', label='District (Present)', recommended='District',
        aliases=('Present District', 'Dist'), example='Sirajganj',
    ),
    FieldSpec(
        key='presentAddress.upazila', label='Upazila (Present)', recommended='Upazila',
        aliases=('Present Upazila', 'Thana', 'Upazila/Thana'), example='Sirajganj Sadar',
    ),
    FieldSpec(
        key='presentAddress.postOffice', label='Post Office (Present)', recommended='Post Office',
        aliases=('Present Post Office', 'PO'), example='Sirajganj',
    ),
    FieldSpec(
        key='presentAddress.division', label='Division (Present)', recommended='Division',
        aliases=('Present Division',), example='Rajshahi',
    ),
    FieldSpec(
        key='permanentAddress.fullAddress', label='Permanent Address',
        recommended='Permanent Address', aliases=('Home Address',),
        example='Village Road, Sirajganj',
    ),
    FieldSpec(
        key='permanentAddress.district', label='District (Permanent)',
        recommended='Permanent District', example='Sirajganj',
    ),

    # ---------------- Institute academics ----------------
    FieldSpec(
        key='currentRollNumber', label='College Roll', recommended='Roll',
        aliases=('Roll No', 'Roll Number', 'College Roll', 'Institute Roll'),
        example='CST-2019-001',
        help_text='Used to detect duplicates. Auto-generated when left blank.',
    ),
    FieldSpec(
        key='currentRegistrationNumber', label='College Registration', recommended='Registration',
        aliases=('Reg', 'Reg No', 'Registration No', 'Registration Number',
                 'College Registration'),
        example='2019CST001',
        help_text='Used to detect duplicates. Auto-generated when left blank.',
    ),
    FieldSpec(
        key='session', label='Session', recommended='Session',
        aliases=('Academic Session', 'Batch'), example='2019-20',
    ),
    FieldSpec(
        key='shift', label='Shift', recommended='Shift',
        type=TYPE_CHOICE, choices=('Morning', 'Day', 'Evening'), example='Morning',
    ),
    FieldSpec(
        key='currentGroup', label='Group (Institute)', recommended='Group',
        aliases=('Section', 'Class Group'), example='A',
    ),
    FieldSpec(
        key='finalCgpa', label='Final CGPA', recommended='CGPA',
        aliases=('Final CGPA', 'Result', 'CGPA (Diploma)'),
        type=TYPE_DECIMAL, example='3.75',
    ),
    FieldSpec(
        key='enrollmentDate', label='Enrollment Date', recommended='Enrollment Date',
        aliases=('Admission Date', 'Joining Date'), type=TYPE_DATE, example='2019-01-15',
    ),

    # ---------------- Previous (SSC) education ----------------
    FieldSpec(
        key='rollNumber', label='Board Roll (SSC)', recommended='Board Roll',
        aliases=('SSC Roll', 'Board Roll No'), example='830577',
    ),
    FieldSpec(
        key='registrationNumber', label='Board Registration (SSC)',
        recommended='Board Registration', aliases=('SSC Registration', 'Board Reg'),
        example='1512345678',
    ),
    FieldSpec(
        key='board', label='Board', recommended='Board',
        aliases=('Education Board', 'SSC Board'), example='Rajshahi',
    ),
    FieldSpec(
        key='group', label='Group (SSC)', recommended='SSC Group',
        aliases=('Board Group',), example='Science',
    ),
    FieldSpec(
        key='passingYear', label='SSC Passing Year', recommended='SSC Passing Year',
        aliases=('SSC Year',), type=TYPE_INT, example='2018',
    ),
    FieldSpec(
        key='gpa', label='SSC GPA', recommended='SSC GPA',
        type=TYPE_DECIMAL, example='4.50',
    ),
    FieldSpec(
        key='institutionName', label='Previous Institution', recommended='Previous Institution',
        aliases=('School', 'School Name', 'Institution', 'Institution Name'),
        example='Sirajganj High School',
    ),
    FieldSpec(
        key='highestExam', label='Highest Exam', recommended='Highest Exam',
        example='SSC',
    ),

    # ---------------- Alumni record ----------------
    FieldSpec(
        key='graduationYear', label='Graduation Year', recommended='Graduation Year',
        target=TARGET_ALUMNI,
        aliases=('Grad Year', 'Year of Graduation', 'Passing Year', 'Graduation'),
        type=TYPE_INT, example='2023',
    ),
    FieldSpec(
        key='alumniType', label='Alumni Type', recommended='Alumni Type',
        target=TARGET_ALUMNI, type=TYPE_CHOICE, choices=('recent', 'established'),
        example='established',
        help_text='Defaults to "established" for imported records.',
    ),
    FieldSpec(
        key='currentSupportCategory', label='Support Category', recommended='Support Category',
        target=TARGET_ALUMNI, type=TYPE_CHOICE,
        choices=('receiving_support', 'needs_extra_support', 'no_support_needed'),
        example='no_support_needed',
    ),
    FieldSpec(
        key='bio', label='Bio / About', recommended='Bio',
        target=TARGET_ALUMNI, aliases=('About', 'Description', 'Summary'),
        example='Software engineer with 3 years of experience.',
    ),
    FieldSpec(
        key='linkedinUrl', label='LinkedIn URL', recommended='LinkedIn',
        target=TARGET_ALUMNI, aliases=('Linkedin Url', 'LinkedIn Profile'),
        example='https://linkedin.com/in/username',
    ),
    FieldSpec(
        key='portfolioUrl', label='Portfolio URL', recommended='Portfolio',
        target=TARGET_ALUMNI, aliases=('Website', 'Portfolio Url', 'Personal Site'),
        example='https://example.com',
    ),
    FieldSpec(
        key='currentPosition.company', label='Company', recommended='Company',
        target=TARGET_ALUMNI, aliases=('Employer', 'Organization', 'Workplace', 'Company Name'),
        example='Acme Ltd',
    ),
    FieldSpec(
        key='currentPosition.position', label='Job Title', recommended='Position',
        target=TARGET_ALUMNI, aliases=('Job Title', 'Designation', 'Job', 'Role'),
        example='Software Engineer',
    ),
)


# ---------------------------------------------------------------------------
# Header normalisation + lookup
# ---------------------------------------------------------------------------
_NON_ALNUM = re.compile(r'[^a-z0-9]+')


def normalize_header(header) -> str:
    """
    Canonical form of a spreadsheet header, so that "Father's Name",
    "father name", "FATHER_NAME" and "Father  Name" all compare equal.
    """
    if header is None:
        return ''
    return _NON_ALNUM.sub(' ', str(header).strip().lower()).strip()


def _build_lookup():
    """
    Map every accepted header to its FieldSpec.

    Two passes, by design:

    1. The *explicit* contract — recommended name, label and aliases. A clash
       here is a configuration bug (two fields fighting over one header), so it
       raises at import time rather than silently routing a column to the wrong
       field. E.g. 'Group' must mean exactly one thing.
    2. The internal ``key`` as a convenience, so a sheet exported straight from
       the database ("fullNameEnglish") still maps. These only fill headers that
       pass 1 did not already claim — an internal name never outranks the
       documented one.
    """
    lookup = {}
    for spec in FIELD_SPECS:
        for candidate in {spec.recommended, spec.label, *spec.aliases}:
            norm = normalize_header(candidate)
            if not norm:
                continue
            existing = lookup.get(norm)
            if existing is not None and existing.key != spec.key:
                raise ValueError(
                    f"Ambiguous alumni-import alias {candidate!r} (normalised {norm!r}): "
                    f"claimed by both {existing.key!r} and {spec.key!r}. "
                    f"Fix FIELD_SPECS in apps/alumni/import_config.py."
                )
            lookup[norm] = spec

    for spec in FIELD_SPECS:
        lookup.setdefault(normalize_header(spec.key), spec)
    return lookup


HEADER_LOOKUP = _build_lookup()

REQUIRED_SPECS = tuple(s for s in FIELD_SPECS if s.required)
REQUIRED_KEYS = tuple(s.key for s in REQUIRED_SPECS)


def resolve_header(header):
    """Return the FieldSpec for a spreadsheet header, or None when unknown."""
    return HEADER_LOOKUP.get(normalize_header(header))


def column_template():
    """Recommended header row, required columns first — used by the UI's
    'Copy Column Template' button and the downloadable sample."""
    required = [s.recommended for s in FIELD_SPECS if s.required]
    optional = [s.recommended for s in FIELD_SPECS if not s.required]
    return required + optional


def documentation():
    """
    Machine-readable catalogue powering the admin "Column Reference" panel.
    The UI renders whatever this returns, so the docs can never drift from the
    behaviour of the importer.
    """
    return {
        'requiredKeys': list(REQUIRED_KEYS),
        'columnTemplate': column_template(),
        'fields': [
            {
                'key': s.key,
                'label': s.label,
                'target': s.target,
                'group': s.group,
                'recommended': s.recommended,
                'aliases': list(s.aliases),
                'required': s.required,
                'type': s.type,
                'choices': list(s.choices),
                'example': s.example,
                'helpText': s.help_text,
            }
            for s in FIELD_SPECS
        ],
    }
