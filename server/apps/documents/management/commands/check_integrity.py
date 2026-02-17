"""
Management command to check integrity of all documents
"""
from django.core.management.base import BaseCommand
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage
import hashlib


class Command(BaseCommand):
    help = 'Check integrity of all documents'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Mark corrupted documents as corrupted in database',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of documents to check',
        )
    
    def handle(self, *args, **options):
        fix = options['fix']
        limit = options['limit']
        
        self.stdout.write(self.style.SUCCESS('\n=== Document Integrity Check ===\n'))
        
        # Get documents to check
        documents = Document.objects.filter(status='active')
        if limit:
            documents = documents[:limit]
        
        total = documents.count()
        self.stdout.write(f'Checking {total} documents...\n')
        
        missing = []
        corrupted = []
        healthy = 0
        checked = 0
        
        for doc in documents:
            checked += 1
            
            # Progress indicator
            if checked % 100 == 0:
                self.stdout.write(f'Progress: {checked}/{total}')
            
            # Check if file exists
            file_info = structured_storage.get_file_info(doc.filePath)
            
            if not file_info or not file_info['exists']:
                missing.append({
                    'id': str(doc.id),
                    'fileName': doc.fileName,
                    'filePath': doc.filePath
                })
                self.stdout.write(
                    self.style.ERROR(f'✗ Missing: {doc.fileName} ({doc.id})')
                )
                
                if fix:
                    doc.status = 'corrupted'
                    doc.save(update_fields=['status'])
                
                continue
            
            # Check file hash
            if doc.fileHash:
                try:
                    with open(file_info['storage_path'], 'rb') as f:
                        current_hash = hashlib.sha256()
                        for chunk in iter(lambda: f.read(4096), b""):
                            current_hash.update(chunk)
                        current_hash = current_hash.hexdigest()
                    
                    if current_hash != doc.fileHash:
                        corrupted.append({
                            'id': str(doc.id),
                            'fileName': doc.fileName,
                            'expected_hash': doc.fileHash,
                            'actual_hash': current_hash
                        })
                        self.stdout.write(
                            self.style.ERROR(f'✗ Corrupted: {doc.fileName} ({doc.id})')
                        )
                        
                        if fix:
                            doc.status = 'corrupted'
                            doc.save(update_fields=['status'])
                        
                        continue
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'✗ Error checking {doc.fileName}: {str(e)}')
                    )
                    continue
            
            healthy += 1
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== Integrity Check Complete ==='))
        self.stdout.write(f'Total checked: {checked}')
        self.stdout.write(self.style.SUCCESS(f'✓ Healthy: {healthy}'))
        
        if missing:
            self.stdout.write(self.style.ERROR(f'✗ Missing: {len(missing)}'))
        
        if corrupted:
            self.stdout.write(self.style.ERROR(f'✗ Corrupted: {len(corrupted)}'))
        
        if fix and (missing or corrupted):
            self.stdout.write(self.style.WARNING(
                f'\nMarked {len(missing) + len(corrupted)} documents as corrupted'
            ))
        
        # Save report
        if missing or corrupted:
            report_file = 'integrity_check_report.txt'
            with open(report_file, 'w') as f:
                f.write('=== Document Integrity Check Report ===\n\n')
                
                if missing:
                    f.write(f'Missing Files ({len(missing)}):\n')
                    for doc in missing:
                        f.write(f"  - {doc['fileName']} (ID: {doc['id']})\n")
                        f.write(f"    Path: {doc['filePath']}\n")
                    f.write('\n')
                
                if corrupted:
                    f.write(f'Corrupted Files ({len(corrupted)}):\n')
                    for doc in corrupted:
                        f.write(f"  - {doc['fileName']} (ID: {doc['id']})\n")
                        f.write(f"    Expected: {doc['expected_hash']}\n")
                        f.write(f"    Actual: {doc['actual_hash']}\n")
                    f.write('\n')
            
            self.stdout.write(f'\nReport saved to: {report_file}')
