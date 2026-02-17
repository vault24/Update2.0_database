"""
Management command to clean up orphaned files and old documents
"""
from django.core.management.base import BaseCommand
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage
from pathlib import Path


class Command(BaseCommand):
    help = 'Clean up orphaned files and old documents'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--orphaned',
            action='store_true',
            help='Remove orphaned files not in database',
        )
        parser.add_argument(
            '--deleted',
            action='store_true',
            help='Remove files for deleted documents',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without deleting',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN MODE ==='))
            self.stdout.write('No files will be deleted\n')
        
        if options['orphaned']:
            self.cleanup_orphaned_files(dry_run)
        
        if options['deleted']:
            self.cleanup_deleted_documents(dry_run)
        
        if not options['orphaned'] and not options['deleted']:
            self.stdout.write(self.style.ERROR(
                'Please specify --orphaned or --deleted'
            ))
    
    def cleanup_orphaned_files(self, dry_run):
        """Remove files not referenced in database"""
        self.stdout.write(self.style.SUCCESS('\n=== Checking for Orphaned Files ===\n'))
        
        # Get all file paths from database
        self.stdout.write('Loading file paths from database...')
        db_paths = set(
            Document.objects.values_list('filePath', flat=True)
        )
        self.stdout.write(f'Found {len(db_paths)} files in database\n')
        
        # Scan storage directory
        self.stdout.write('Scanning storage directory...')
        storage_root = structured_storage.storage_root
        orphaned = []
        total_size = 0
        
        for file_path in storage_root.rglob('*'):
            if file_path.is_file():
                relative_path = str(file_path.relative_to(storage_root)).replace('\\', '/')
                if relative_path not in db_paths:
                    file_size = file_path.stat().st_size
                    orphaned.append({
                        'path': file_path,
                        'relative_path': relative_path,
                        'size': file_size
                    })
                    total_size += file_size
        
        self.stdout.write(f'\nFound {len(orphaned)} orphaned files')
        self.stdout.write(f'Total size: {total_size / (1024 * 1024):.2f} MB\n')
        
        if orphaned:
            if not dry_run:
                self.stdout.write('Deleting orphaned files...')
                deleted_count = 0
                for item in orphaned:
                    try:
                        item['path'].unlink()
                        deleted_count += 1
                        self.stdout.write(f"✓ Deleted: {item['relative_path']}")
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f"✗ Failed to delete {item['relative_path']}: {e}")
                        )
                
                self.stdout.write(self.style.SUCCESS(
                    f'\nDeleted {deleted_count} orphaned files'
                ))
            else:
                self.stdout.write('\nFiles that would be deleted:')
                for item in orphaned[:20]:  # Show first 20
                    self.stdout.write(f"  - {item['relative_path']} ({item['size'] / 1024:.2f} KB)")
                
                if len(orphaned) > 20:
                    self.stdout.write(f"  ... and {len(orphaned) - 20} more")
        else:
            self.stdout.write(self.style.SUCCESS('No orphaned files found'))
    
    def cleanup_deleted_documents(self, dry_run):
        """Remove physical files for deleted documents"""
        self.stdout.write(self.style.SUCCESS('\n=== Cleaning Up Deleted Documents ===\n'))
        
        deleted_docs = Document.objects.filter(status='deleted')
        total = deleted_docs.count()
        
        self.stdout.write(f'Found {total} deleted documents\n')
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No deleted documents to clean up'))
            return
        
        deleted_count = 0
        failed_count = 0
        total_size = 0
        
        for doc in deleted_docs:
            file_info = structured_storage.get_file_info(doc.filePath)
            
            if file_info and file_info['exists']:
                total_size += file_info['file_size']
                
                if not dry_run:
                    success = structured_storage.delete_file(doc.filePath)
                    if success:
                        deleted_count += 1
                        self.stdout.write(f"✓ Deleted: {doc.fileName}")
                    else:
                        failed_count += 1
                        self.stdout.write(
                            self.style.ERROR(f"✗ Failed to delete: {doc.fileName}")
                        )
                else:
                    self.stdout.write(f"Would delete: {doc.fileName} ({file_info['file_size'] / 1024:.2f} KB)")
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'\nDeleted {deleted_count} files ({total_size / (1024 * 1024):.2f} MB)'
            ))
            if failed_count > 0:
                self.stdout.write(self.style.ERROR(f'Failed to delete {failed_count} files'))
        else:
            self.stdout.write(f'\nWould delete {total} files ({total_size / (1024 * 1024):.2f} MB)')
