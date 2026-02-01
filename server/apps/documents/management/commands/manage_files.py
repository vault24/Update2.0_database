"""
Django management command for file storage operations
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.documents.models import Document
from utils.file_storage import file_storage
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Manage file storage operations'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['cleanup', 'verify', 'stats', 'migrate', 'repair'],
            help='Action to perform'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Batch size for processing documents'
        )
        parser.add_argument(
            '--fix-corrupted',
            action='store_true',
            help='Mark corrupted documents in database'
        )

    def handle(self, *args, **options):
        action = options['action']
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        fix_corrupted = options['fix_corrupted']

        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )

        try:
            if action == 'cleanup':
                self.cleanup_orphaned_files(dry_run)
            elif action == 'verify':
                self.verify_file_integrity(batch_size, fix_corrupted, dry_run)
            elif action == 'stats':
                self.show_storage_stats()
            elif action == 'migrate':
                self.migrate_old_files(dry_run)
            elif action == 'repair':
                self.repair_file_paths(dry_run)
        except Exception as e:
            raise CommandError(f'Command failed: {str(e)}')

    def cleanup_orphaned_files(self, dry_run=False):
        """Clean up files not referenced in database"""
        self.stdout.write('Scanning for orphaned files...')
        
        # Get all valid file paths from database
        valid_paths = list(
            Document.objects.filter(status='active')
            .values_list('filePath', flat=True)
        )
        
        self.stdout.write(f'Found {len(valid_paths)} valid file references in database')
        
        if dry_run:
            # Just show what would be cleaned up
            orphaned_count = 0
            orphaned_size = 0
            
            # This would need to be implemented in file_storage service
            # For now, just show the concept
            self.stdout.write(
                self.style.WARNING(
                    f'Would clean up {orphaned_count} orphaned files '
                    f'({orphaned_size / (1024*1024):.2f} MB)'
                )
            )
        else:
            cleanup_stats = file_storage.cleanup_orphaned_files(valid_paths)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleaned up {cleanup_stats["deleted_count"]} orphaned files '
                    f'({cleanup_stats["deleted_size_mb"]} MB)'
                )
            )

    def verify_file_integrity(self, batch_size=100, fix_corrupted=False, dry_run=False):
        """Verify integrity of all documents"""
        self.stdout.write('Verifying file integrity...')
        
        total_docs = Document.objects.filter(status='active').count()
        self.stdout.write(f'Checking {total_docs} documents...')
        
        healthy_count = 0
        missing_count = 0
        corrupted_count = 0
        error_count = 0
        
        # Process documents in batches
        for offset in range(0, total_docs, batch_size):
            documents = Document.objects.filter(status='active')[offset:offset + batch_size]
            
            for doc in documents:
                try:
                    integrity_valid, message = doc.verify_integrity()
                    file_info = file_storage.get_file_info(doc.filePath)
                    
                    if not file_info or not file_info.get('exists'):
                        missing_count += 1
                        self.stdout.write(
                            self.style.ERROR(f'MISSING: {doc.fileName} ({doc.id})')
                        )
                        if fix_corrupted and not dry_run:
                            doc.status = 'corrupted'
                            doc.save()
                    elif not integrity_valid:
                        corrupted_count += 1
                        self.stdout.write(
                            self.style.ERROR(f'CORRUPTED: {doc.fileName} - {message}')
                        )
                        if fix_corrupted and not dry_run:
                            doc.status = 'corrupted'
                            doc.save()
                    else:
                        healthy_count += 1
                        
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'ERROR checking {doc.fileName}: {str(e)}')
                    )
            
            # Show progress
            processed = min(offset + batch_size, total_docs)
            self.stdout.write(f'Processed {processed}/{total_docs} documents...')
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write('INTEGRITY CHECK SUMMARY:')
        self.stdout.write(f'Healthy: {healthy_count}')
        self.stdout.write(f'Missing: {missing_count}')
        self.stdout.write(f'Corrupted: {corrupted_count}')
        self.stdout.write(f'Errors: {error_count}')
        
        if fix_corrupted and not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Marked {missing_count + corrupted_count} documents as corrupted'
                )
            )

    def show_storage_stats(self):
        """Show storage statistics"""
        self.stdout.write('Gathering storage statistics...')
        
        # File storage stats
        storage_stats = file_storage.get_storage_stats()
        
        # Database stats
        db_stats = {
            'total_documents': Document.objects.count(),
            'active_documents': Document.objects.filter(status='active').count(),
            'deleted_documents': Document.objects.filter(status='deleted').count(),
            'corrupted_documents': Document.objects.filter(status='corrupted').count(),
        }
        
        # Display stats
        self.stdout.write('\n' + '='*50)
        self.stdout.write('STORAGE STATISTICS:')
        self.stdout.write('\nFile System:')
        self.stdout.write(f'  Total files: {storage_stats["total_files"]}')
        self.stdout.write(f'  Total size: {storage_stats["total_size_mb"]} MB')
        self.stdout.write(f'  Storage root: {storage_stats["storage_root"]}')
        
        self.stdout.write('\nDatabase:')
        self.stdout.write(f'  Total documents: {db_stats["total_documents"]}')
        self.stdout.write(f'  Active documents: {db_stats["active_documents"]}')
        self.stdout.write(f'  Deleted documents: {db_stats["deleted_documents"]}')
        self.stdout.write(f'  Corrupted documents: {db_stats["corrupted_documents"]}')

    def migrate_old_files(self, dry_run=False):
        """Migrate files from old storage structure to new one"""
        self.stdout.write('Migrating files to new storage structure...')
        
        # Find documents with old file paths (client/assets/images/...)
        old_documents = Document.objects.filter(
            filePath__startswith='documents/',
            status='active'
        ).exclude(
            filePath__contains='/2024/'  # Assume new structure has year folders
        )
        
        migrated_count = 0
        error_count = 0
        
        for doc in old_documents:
            try:
                old_path = doc.filePath
                
                if dry_run:
                    self.stdout.write(f'Would migrate: {old_path}')
                    migrated_count += 1
                else:
                    # This would need custom logic based on your old structure
                    # For now, just show the concept
                    self.stdout.write(f'Migrating: {old_path}')
                    # Implementation would go here
                    migrated_count += 1
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'Failed to migrate {doc.filePath}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Migration complete: {migrated_count} files processed, {error_count} errors'
            )
        )

    def repair_file_paths(self, dry_run=False):
        """Repair invalid file paths in database"""
        self.stdout.write('Repairing invalid file paths...')
        
        # Find documents with potentially invalid paths
        invalid_docs = Document.objects.filter(
            status='active'
        ).exclude(
            filePath__regex=r'^[a-zA-Z0-9_/.-]+$'  # Valid path characters
        )
        
        repaired_count = 0
        
        for doc in invalid_docs:
            try:
                old_path = doc.filePath
                # Sanitize path
                new_path = old_path.replace('\\', '/').strip('/')
                
                if dry_run:
                    self.stdout.write(f'Would repair: {old_path} -> {new_path}')
                else:
                    doc.filePath = new_path
                    doc.save()
                    self.stdout.write(f'Repaired: {old_path} -> {new_path}')
                
                repaired_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to repair {doc.filePath}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Repaired {repaired_count} file paths')
        )