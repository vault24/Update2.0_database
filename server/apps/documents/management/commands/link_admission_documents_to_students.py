"""
Management command to link admission documents to their corresponding students
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.documents.models import Document
from apps.students.models import Student
from apps.admissions.models import Admission


class Command(BaseCommand):
    help = 'Link admission documents to their corresponding student records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Find all admission documents that don't have a student linked
        admission_docs = Document.objects.filter(
            source_type='admission',
            student__isnull=True
        )
        
        self.stdout.write(f'Found {admission_docs.count()} admission documents without student links')
        
        updated_count = 0
        failed_count = 0
        
        for doc in admission_docs:
            try:
                # Get the admission record
                if not doc.source_id:
                    self.stdout.write(self.style.WARNING(
                        f'Document {doc.id} ({doc.fileName}) has no source_id, skipping'
                    ))
                    failed_count += 1
                    continue
                
                try:
                    admission = Admission.objects.get(id=doc.source_id)
                except Admission.DoesNotExist:
                    self.stdout.write(self.style.WARNING(
                        f'Admission {doc.source_id} not found for document {doc.fileName}, skipping'
                    ))
                    failed_count += 1
                    continue
                
                # Check if admission is approved and has a related student
                if admission.status != 'approved':
                    continue
                
                # Find the student created from this admission
                # The student should have the same user as the admission
                try:
                    student = Student.objects.get(user=admission.user)
                except Student.DoesNotExist:
                    self.stdout.write(self.style.WARNING(
                        f'No student found for admission {admission.id} (user: {admission.user.username}), skipping'
                    ))
                    failed_count += 1
                    continue
                except Student.MultipleObjectsReturned:
                    # If multiple students, get the first one
                    student = Student.objects.filter(user=admission.user).first()
                    self.stdout.write(self.style.WARNING(
                        f'Multiple students found for user {admission.user.username}, using first one'
                    ))
                
                # Link the document to the student
                if not dry_run:
                    doc.student = student
                    doc.save(update_fields=['student'])
                
                self.stdout.write(self.style.SUCCESS(
                    f'✓ Linked document {doc.fileName} to student {student.fullNameEnglish} (ID: {student.id})'
                ))
                updated_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'Error processing document {doc.id}: {str(e)}'
                ))
                failed_count += 1
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'Successfully linked: {updated_count} documents'))
        if failed_count > 0:
            self.stdout.write(self.style.WARNING(f'Failed/Skipped: {failed_count} documents'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - No changes were made'))
            self.stdout.write('Run without --dry-run to apply changes')
