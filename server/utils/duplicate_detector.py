"""
Duplicate Detection Utility
Detects duplicate files before saving to prevent storage waste
"""
import hashlib
import logging

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """Detect duplicate files before saving"""
    
    @staticmethod
    def calculate_hash(file_obj):
        """
        Calculate SHA256 hash of file
        
        Args:
            file_obj: Django UploadedFile object
            
        Returns:
            str: SHA256 hash of file content
        """
        hash_sha256 = hashlib.sha256()
        
        # Read file in chunks
        for chunk in file_obj.chunks():
            hash_sha256.update(chunk)
        
        # Reset file pointer for subsequent reads
        file_obj.seek(0)
        
        return hash_sha256.hexdigest()
    
    @staticmethod
    def find_duplicate(file_hash, student_id=None):
        """
        Check if file with same hash already exists
        
        Args:
            file_hash: SHA256 hash of file
            student_id: Optional student ID to check for same student
            
        Returns:
            Document object if duplicate found, None otherwise
        """
        from apps.documents.models import Document
        
        queryset = Document.objects.filter(
            fileHash=file_hash,
            status='active'
        )
        
        # If student_id provided, check for same student first
        if student_id:
            student_duplicate = queryset.filter(student_id=student_id).first()
            if student_duplicate:
                return student_duplicate
        
        # Return any duplicate
        return queryset.first()
    
    @staticmethod
    def check_before_upload(file_obj, student_id=None, document_category=None):
        """
        Check for duplicates before uploading
        
        Args:
            file_obj: Django UploadedFile object
            student_id: Optional student ID
            document_category: Optional document category
            
        Returns:
            dict: {
                'is_duplicate': bool,
                'file_hash': str,
                'message': str (if duplicate),
                'existing_document': Document (if duplicate)
            }
        """
        # Calculate file hash
        file_hash = DuplicateDetector.calculate_hash(file_obj)
        
        # Check for duplicate
        duplicate = DuplicateDetector.find_duplicate(file_hash, student_id)
        
        if duplicate:
            # Same file already exists
            if duplicate.student_id == student_id:
                message = f'This exact file is already uploaded for this student as "{duplicate.fileName}"'
            else:
                message = f'This exact file already exists in the system'
            
            logger.info(f"Duplicate file detected: {file_hash}")
            
            return {
                'is_duplicate': True,
                'file_hash': file_hash,
                'message': message,
                'existing_document': duplicate
            }
        
        return {
            'is_duplicate': False,
            'file_hash': file_hash
        }
    
    @staticmethod
    def get_duplicate_stats():
        """
        Get statistics about duplicate files
        
        Returns:
            dict: Statistics about duplicates
        """
        from apps.documents.models import Document
        from django.db.models import Count
        
        # Find files with same hash
        duplicates = Document.objects.filter(
            status='active'
        ).values('fileHash').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        total_duplicates = sum(d['count'] - 1 for d in duplicates)
        
        # Calculate wasted space
        wasted_space = 0
        for dup in duplicates:
            docs = Document.objects.filter(
                fileHash=dup['fileHash'],
                status='active'
            )
            if docs.exists():
                file_size = docs.first().fileSize
                wasted_space += file_size * (dup['count'] - 1)
        
        return {
            'unique_duplicates': len(duplicates),
            'total_duplicate_files': total_duplicates,
            'wasted_space_bytes': wasted_space,
            'wasted_space_mb': round(wasted_space / (1024 * 1024), 2),
            'wasted_space_gb': round(wasted_space / (1024 * 1024 * 1024), 2),
        }


# Global instance
duplicate_detector = DuplicateDetector()
