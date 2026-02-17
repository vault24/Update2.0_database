"""
Management command to show storage statistics
"""
from django.core.management.base import BaseCommand
from apps.documents.models import Document
from utils.structured_file_storage import structured_storage
from utils.duplicate_detector import duplicate_detector
from django.db.models import Sum, Count, Avg


class Command(BaseCommand):
    help = 'Show storage statistics'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== Storage Statistics ===\n'))
        
        # Overall stats
        total_docs = Document.objects.filter(status='active').count()
        total_size = Document.objects.filter(status='active').aggregate(
            total=Sum('fileSize')
        )['total'] or 0
        avg_size = Document.objects.filter(status='active').aggregate(
            avg=Avg('fileSize')
        )['avg'] or 0
        
        self.stdout.write(f'Total Documents: {total_docs:,}')
        self.stdout.write(f'Total Size: {total_size / (1024**3):.2f} GB')
        self.stdout.write(f'Average File Size: {avg_size / (1024**2):.2f} MB')
        
        # By document type
        self.stdout.write('\n--- By Document Type ---')
        by_type = Document.objects.filter(status='active').values(
            'document_type'
        ).annotate(
            count=Count('id'),
            size=Sum('fileSize')
        ).order_by('-count')
        
        for item in by_type:
            self.stdout.write(
                f"{item['document_type']}: {item['count']:,} docs, "
                f"{item['size'] / (1024**2):.2f} MB"
            )
        
        # By year
        self.stdout.write('\n--- By Year ---')
        by_year = Document.objects.filter(status='active').values(
            'year'
        ).annotate(
            count=Count('id'),
            size=Sum('fileSize')
        ).order_by('-year')
        
        for item in by_year:
            self.stdout.write(
                f"{item['year']}: {item['count']:,} docs, "
                f"{item['size'] / (1024**2):.2f} MB"
            )
        
        # By category
        self.stdout.write('\n--- Top 10 Categories ---')
        by_category = Document.objects.filter(status='active').values(
            'document_category'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        for item in by_category:
            self.stdout.write(
                f"{item['document_category']}: {item['count']:,} docs"
            )
        
        # Status breakdown
        self.stdout.write('\n--- By Status ---')
        by_status = Document.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in by_status:
            self.stdout.write(f"{item['status']}: {item['count']:,} docs")
        
        # Duplicate stats
        self.stdout.write('\n--- Duplicate Files ---')
        try:
            dup_stats = duplicate_detector.get_duplicate_stats()
            self.stdout.write(f"Unique duplicates: {dup_stats['unique_duplicates']}")
            self.stdout.write(f"Total duplicate files: {dup_stats['total_duplicate_files']}")
            self.stdout.write(f"Wasted space: {dup_stats['wasted_space_mb']:.2f} MB")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error calculating duplicates: {e}"))
        
        # File system stats
        self.stdout.write('\n--- File System Stats ---')
        try:
            fs_stats = structured_storage.get_storage_stats()
            self.stdout.write(f"Storage root: {fs_stats['storage_root']}")
            self.stdout.write(f"Total files on disk: {fs_stats['total_files']:,}")
            self.stdout.write(f"Total size on disk: {fs_stats['total_size_gb']:.2f} GB")
            
            if fs_stats['by_type']:
                self.stdout.write('\nBy type on disk:')
                for doc_type, stats in fs_stats['by_type'].items():
                    self.stdout.write(
                        f"  {doc_type}: {stats['files']:,} files, {stats['size_mb']:.2f} MB"
                    )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error getting file system stats: {e}"))
        
        # Recommendations
        self.stdout.write('\n--- Recommendations ---')
        
        if total_size > 50 * 1024**3:  # > 50GB
            self.stdout.write(self.style.WARNING(
                '⚠ Storage usage is high. Consider archiving old documents.'
            ))
        
        try:
            dup_stats = duplicate_detector.get_duplicate_stats()
            if dup_stats['wasted_space_mb'] > 100:
                self.stdout.write(self.style.WARNING(
                    f"⚠ {dup_stats['wasted_space_mb']:.2f} MB wasted on duplicates. "
                    "Consider implementing duplicate prevention."
                ))
        except:
            pass
        
        deleted_count = Document.objects.filter(status='deleted').count()
        if deleted_count > 100:
            self.stdout.write(self.style.WARNING(
                f"⚠ {deleted_count} deleted documents. Run cleanup_documents --deleted to free space."
            ))
        
        self.stdout.write('')
