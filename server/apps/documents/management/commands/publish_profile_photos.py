"""
Mark every student's current profile-photo document as public.

Profile pictures are rendered with plain <img src="/files/..."> tags, which
cannot carry a JWT Authorization header, so SecureFileView only serves them
when the underlying Document is `is_public`. New photos are published
automatically when they are assigned (Document.assign_as_profile_photo);
this command backfills documents assigned before that behaviour existed.

Idempotent — safe to run on every deploy.
"""
from django.core.management.base import BaseCommand

from apps.documents.models import Document
from apps.students.models import Student


class Command(BaseCommand):
    help = "Mark every student's current profile-photo document as public (idempotent)."

    def handle(self, *args, **options):
        published = 0
        scanned = 0

        students = Student.objects.exclude(profilePhoto='').only('id', 'profilePhoto')
        for student in students.iterator():
            scanned += 1
            # Student.profilePhoto stores '/files/<filePath>' (possibly absolute).
            path = student.profilePhoto
            if '/files/' in path:
                path = path.split('/files/', 1)[1]
            if not path:
                continue

            updated = Document.objects.filter(
                filePath=path, is_public=False
            ).update(is_public=True)
            published += updated

        self.stdout.write(self.style.SUCCESS(
            f'Scanned {scanned} students with a profile photo; '
            f'published {published} document(s).'
        ))
