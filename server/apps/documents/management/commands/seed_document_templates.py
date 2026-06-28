"""
Seed DocumentTemplate rows from the existing front-end certificate HTML files.

Reads the 8 templates shipped in client/admin-side/public/templates and upserts
them as DocumentTemplate records so the catalog is backend-managed. Safe to run
repeatedly (updates html_content, never clobbers the availability flags an admin
may have changed).

Usage:  python manage.py seed_document_templates
"""
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.documents.models import DocumentTemplate


# slug -> (display name, category, source filename, required fields)
TEMPLATES = [
    ('eligibility-statement', 'Eligibility Statement', 'eligibility', 'EligibilityStatement.html',
     ['Student Name', 'Father Name', 'Mother Name', 'Roll No', 'Reg No', 'Session', 'Technology Name']),
    ('testimonial', 'Testimonial', 'testimonial', 'Testimonial.html',
     ['Student Name', 'Father Name', 'Mother Name', 'Roll No', 'Department', 'Session']),
    ('id-card', 'ID Card', 'idCard', 'IdCard.html',
     ['Student Name', 'Roll No', 'Department', 'Session']),
    ('transcript', 'Academic Transcript', 'transcript', 'CourseCompletionCertificate.html',
     ['Student Name', 'Roll No', 'Registration Number', 'Department', 'Session']),
    ('character-certificate', 'Character Certificate', 'character', 'characterCertificate.html',
     ['Student Name', 'Father Name', 'Roll No', 'Department', 'Session']),
    ('clearance-certificate', 'Clearance Certificate', 'clearance', 'Prottayon.html',
     ['Student Name', 'Roll No', 'Department', 'Session']),
    ('bonafide-certificate', 'Bonafide Certificate', 'bonafide', 'Sallu_certificate.html',
     ['Student Name', 'Roll No', 'Department', 'Session']),
    ('completion-certificate', 'Certificate of Completion', 'completion', 'Certificate.html',
     ['Student Name', 'Father Name', 'Mother Name', 'Roll No', 'Registration Number', 'Department', 'Session']),
]


class Command(BaseCommand):
    help = 'Seed/refresh document templates from the front-end HTML files.'

    def handle(self, *args, **options):
        # server/ is BASE_DIR; templates live under the sibling client/ folder.
        templates_dir = Path(settings.BASE_DIR).parent / 'client' / 'admin-side' / 'public' / 'templates'

        created, updated, missing = 0, 0, 0
        for slug, name, category, filename, required in TEMPLATES:
            path = templates_dir / filename
            html = ''
            if path.exists():
                try:
                    html = path.read_text(encoding='utf-8')
                except Exception as exc:  # pragma: no cover
                    self.stderr.write(f'  ! Could not read {filename}: {exc}')
            else:
                missing += 1
                self.stderr.write(f'  ! Missing template file: {path}')

            obj, was_created = DocumentTemplate.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'category': category,
                    'html_content': html,
                    'required_fields': required,
                    'available_to_students': True,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  + created {slug}'))
            else:
                # Refresh content/metadata but preserve admin-controlled flags.
                obj.name = name
                obj.category = category
                obj.required_fields = required
                if html:
                    obj.html_content = html
                obj.save(update_fields=['name', 'category', 'required_fields', 'html_content', 'updated_at'])
                updated += 1
                self.stdout.write(f'  ~ updated {slug}')

        self.stdout.write(self.style.SUCCESS(
            f'Done. created={created} updated={updated} missing_files={missing}'
        ))
