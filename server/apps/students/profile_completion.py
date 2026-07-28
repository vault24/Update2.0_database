"""
Profile completion for a STUDENT account.

Drives the completion status shown on the dashboard welcome card. Every missing
item carries the page that fixes it, so the card can send the student straight
to the right place:

  * ``documents`` — a required admission document has not been uploaded
    (see documents.admission_documents.build_checklist)
  * ``profile``   — a Career & Portfolio / contact detail is empty

Mirrors alumni.services.compute_profile_completion in spirit; kept separate
because a current student is scored on their admission documents too.
"""

PROFILE = 'profile'
DOCUMENTS = 'documents'


def _has(value):
    return bool(value and str(value).strip() and str(value).strip() != 'N/A')


def compute_student_profile_completion(student, admission=None):
    """
    Returns:
        {
          'percentage': int 0-100,
          'completed': int, 'total': int, 'complete': bool,
          'missing': [{'label': str, 'target': 'documents'|'profile'}, ...],
          'primaryTarget': 'documents'|'profile'|None,
          'targetCounts': {'documents': int, 'profile': int},
        }
    """
    if student is None:
        return {
            'percentage': 0, 'completed': 0, 'total': 0, 'complete': False,
            'missing': [], 'primaryTarget': None,
            'targetCounts': {DOCUMENTS: 0, PROFILE: 0},
        }

    alumni = getattr(student, 'alumni', None)
    address = student.presentAddress if isinstance(student.presentAddress, dict) else {}

    # (label, done, target)
    items = [
        ('Profile photo', _has(student.profilePhoto), DOCUMENTS),
        ('Contact details', _has(student.email) and _has(student.mobileStudent), PROFILE),
        ('Present address', _has(address.get('district')), PROFILE),
        ('About / bio', _has(getattr(alumni, 'bio', '')), PROFILE),
        ('A career or study entry', len(getattr(alumni, 'careerHistory', None) or []) > 0, PROFILE),
        ('At least 3 skills', len(getattr(alumni, 'skills', None) or []) >= 3, PROFILE),
        ('A course or certification', len(getattr(alumni, 'courses', None) or []) > 0, PROFILE),
        ('A career highlight', len(getattr(alumni, 'highlights', None) or []) > 0, PROFILE),
    ]

    # Required admission documents — one scored item per missing document, so a
    # student who skipped three uploads sees all three named.
    try:
        from apps.documents.admission_documents import build_checklist
        for entry in build_checklist(student=student, admission=admission):
            if entry['required']:
                items.append((entry['label'], entry['submitted'], DOCUMENTS))
    except Exception:  # never let the checklist break the dashboard
        pass

    completed = sum(1 for _, done, _ in items if done)
    total = len(items)
    percentage = round((completed / total) * 100) if total else 0

    missing = [
        {'label': label, 'target': target}
        for label, done, target in items if not done
    ]
    counts = {
        DOCUMENTS: sum(1 for m in missing if m['target'] == DOCUMENTS),
        PROFILE: sum(1 for m in missing if m['target'] == PROFILE),
    }
    # Documents are the blocking ones, so they win when both are outstanding.
    primary = None
    if counts[DOCUMENTS]:
        primary = DOCUMENTS
    elif counts[PROFILE]:
        primary = PROFILE

    return {
        'percentage': percentage,
        'completed': completed,
        'total': total,
        'complete': not missing,
        'missing': missing,
        'primaryTarget': primary,
        'targetCounts': counts,
    }
