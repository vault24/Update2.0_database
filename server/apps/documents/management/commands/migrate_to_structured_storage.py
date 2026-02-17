"""
Management command to migrate existing documents to structured storage
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.documents.models import Document
from apps.students.models import Student
from apps.teachers.models import Teacher
from apps.alumni.models import Alumni
from utils.structured_file_storage import structured_storage
from pathlib import Path
import shutil
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate existing documents to structured storage system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a dry run without making changes',
        )
        parser.add_argument(
            '--document-type',
            type=str,
            choices=['student', 'teacher', 'alumni', 'all'],
            default='all',
            help='Type of documents to migrate',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of documents to process in each batch',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        document_type = options['document_type']
        batch_size = options['batch_size']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        self.stdout.write(self.style.SUCCESS('Starting document migration...'))
        
        stats = {
            'total': 0,
            'migrated': 0,
            'skipped': 0,
            'failed': 0,
        }
        
        # Migrate based on document type
        if document_type in ['student', 'all']:
            self.stdout.write('Migrating student documents...')
            student_stats = self._migrate_student_documents(dry_run, batch_size)
            self._update_stats(stats, student_stats)
        
        if document_type in ['teacher', 'all']:
            self.stdout.write('Migrating teacher documents...')
            teacher_stats = self._migrate_teacher_documents(dry_run, batch_size)
            self._update_stats(stats, teacher_stats)
        
        if document_type in ['alumni', 'all']:
            self.stdout.write('Migrating alumni documents...')
            alumni_stats = self._migrate_alumni_documents(dry_run, batch_size)
            self._update_stats(stats, alumni_stats)
        
        # Print summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Migration Summary:'))
        self.stdout.write(f"Total documents: {stats['total']}")
        self.stdout.write(self.style.SUCCESS(f"Migrated: {stats['migrated']}"))
        self.stdout.write(self.style.WARNING(f"Skipped: {stats['skipped']}"))
        self.stdout.write(self.style.ERROR(f"Failed: {stats['failed']}"))
        self.stdout.write('='*60)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('\nMigration complete!'))
    
    def _migrate_student_documents(self, dry_run: bool, batch_size: int) -> dict:
        """Migrate student documents to structured storage"""
        stats = {'total': 0, 'migrated': 0, 'skipped': 0, 'failed': 0}
        
        # Get all student documents
        documents = Document.objects.filter(
            student__isnull=False,
            status='active'
        ).select_related('student', 'student__department')
        
        stats['total'] = documents.count()
        self.stdout.write(f"Found {stats['total']} student documents")
        
        # Process in batches
        for i in range(0, stats['total'], batch_size):
            batch = documents[i:i+batch_size]
            
            for doc in batch:
                try:
                    # Check if already migrated (path starts with Student_Documents)
                    if doc.filePath.startswith('Student_Documents/'):
                        stats['skipped'] += 1
                        continue
                    
                    # Get student data
                    student = doc.student
                    if not student or not student.department:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Skipping document {doc.id}: Missing student or department"
                            )
                        )
                        stats['skipped'] += 1
                        continue
                    
                    # Prepare student data for structured storage
                    student_data = {
                        'department_code': self._get_department_code(student.department),
                        'session': student.session,
                        'shift': student.shift.lower().replace(' ', '-'),
                        'student_name': self._clean_name(student.fullNameEnglish),
                        'student_id': student.currentRollNumber,
                    }
                    
                    # Determine document category
                    document_category = self._map_category(doc.category)
                    
                    # Generate new path
                    new_path = self._generate_student_path(
                        student_data, document_category, doc.fileType
                    )
                    
                    if not dry_run:
                        # Copy file to new location
                        old_full_path = structured_storage._get_secure_path(doc.filePath)
                        new_full_path = structured_storage.storage_root / new_path
                        
                        if old_full_path and old_full_path.exists():
                            # Ensure new directory exists
                            new_full_path.parent.mkdir(parents=True, exist_ok=True)
                            
                            # Copy file
                            shutil.copy2(old_full_path, new_full_path)
                            
                            # Update document record
                            with transaction.atomic():
                                doc.filePath = new_path
                                doc.document_type = 'student'
                                doc.department_code = student_data['department_code']
                                doc.session = student_data['session']
                                doc.shift = student_data['shift']
                                doc.owner_name = student_data['student_name']
                                doc.owner_id = student_data['student_id']
                                doc.document_category = document_category
                                doc.save()
                            
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"Migrated: {doc.fileName} -> {new_path}"
                                )
                            )
                            stats['migrated'] += 1
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"File not found: {doc.filePath}"
                                )
                            )
                            stats['failed'] += 1
                    else:
                        self.stdout.write(f"Would migrate: {doc.filePath} -> {new_path}")
                        stats['migrated'] += 1
                
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to migrate document {doc.id}: {str(e)}"
                        )
                    )
                    stats['failed'] += 1
                    logger.error(f"Migration error for document {doc.id}: {str(e)}")
        
        return stats
    
    def _migrate_teacher_documents(self, dry_run: bool, batch_size: int) -> dict:
        """Migrate teacher documents to structured storage"""
        stats = {'total': 0, 'migrated': 0, 'skipped': 0, 'failed': 0}
        
        # Get all teacher documents (if you have a teacher field in Document model)
        # For now, return empty stats
        self.stdout.write(self.style.WARNING('Teacher document migration not implemented yet'))
        
        return stats
    
    def _migrate_alumni_documents(self, dry_run: bool, batch_size: int) -> dict:
        """Migrate alumni documents to structured storage"""
        stats = {'total': 0, 'migrated': 0, 'skipped': 0, 'failed': 0}
        
        # Get all alumni documents (if you have an alumni field in Document model)
        # For now, return empty stats
        self.stdout.write(self.style.WARNING('Alumni document migration not implemented yet'))
        
        return stats
    
    def _generate_student_path(
        self, student_data: dict, document_category: str, file_ext: str
    ) -> str:
        """Generate new structured path for student document"""
        dept_code = student_data['department_code']
        session = student_data['session']
        shift = student_data['shift']
        student_name = student_data['student_name']
        student_id = student_data['student_id']
        
        student_folder = f"{student_name}_{student_id}"
        
        # Get standardized filename
        if document_category in structured_storage.DOCUMENT_CATEGORIES:
            category_config = structured_storage.DOCUMENT_CATEGORIES[document_category]
            if category_config['filename']:
                filename = f"{category_config['filename']}.{file_ext}"
            else:
                filename = f"document_{document_category}.{file_ext}"
        else:
            filename = f"document.{file_ext}"
        
        # Build path
        if document_category == 'other':
            path = f"Student_Documents/{dept_code}/{session}/{shift}/{student_folder}/other_documents/{filename}"
        else:
            path = f"Student_Documents/{dept_code}/{session}/{shift}/{student_folder}/{filename}"
        
        return path.replace('\\', '/')
    
    def _get_department_code(self, department) -> str:
        """Get sanitized department code"""
        if hasattr(department, 'code'):
            return department.code.lower().replace(' ', '-')
        elif hasattr(department, 'name'):
            return department.name.lower().replace(' ', '-')
        return 'unknown'
    
    def _clean_name(self, name: str) -> str:
        """Clean name for use in path"""
        # Remove spaces and special characters
        name = name.replace(' ', '')
        name = ''.join(c for c in name if c.isalnum() or c in ['_', '-'])
        return name[:50]  # Limit length
    
    def _map_category(self, old_category: str) -> str:
        """Map old category to new standardized category"""
        category_mapping = {
            'Photo': 'photo',
            'Birth Certificate': 'birth_certificate',
            'NID': 'nid',
            'National ID': 'nid',
            'Marksheet': 'ssc_marksheet',
            'Certificate': 'ssc_certificate',
            'Testimonial': 'transcript',
            'Medical Certificate': 'medical_certificate',
            'Quota Document': 'quota_document',
            'Other': 'other',
        }
        
        return category_mapping.get(old_category, 'other')
    
    def _update_stats(self, total_stats: dict, batch_stats: dict) -> None:
        """Update total statistics with batch statistics"""
        for key in batch_stats:
            total_stats[key] += batch_stats[key]
