"""
Enhanced File Storage Service
Provides secure, organized file storage with validation and management
"""
import os
import uuid
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class FileStorageService:
    """
    Enhanced file storage service with security, validation, and organization
    """
    
    def __init__(self):
        self.storage_root = getattr(settings, 'FILE_STORAGE_ROOT', settings.BASE_DIR / 'storage')
        self.storage_url = getattr(settings, 'FILE_STORAGE_URL', '/files/')
        self.max_file_sizes = getattr(settings, 'MAX_FILE_SIZES', {
            'image': 5 * 1024 * 1024,
            'document': 10 * 1024 * 1024,
        })
        self.allowed_types = getattr(settings, 'ALLOWED_FILE_TYPES', {
            'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'document': ['pdf', 'doc', 'docx', 'txt', 'rtf'],
        })
        self.storage_structure = getattr(settings, 'FILE_STORAGE_STRUCTURE', {
            'documents': 'documents/{year}/{month}/',
            'images': 'images/{year}/{month}/',
        })
        
        # Ensure storage root exists
        self.storage_root.mkdir(parents=True, exist_ok=True)
    
    def save_file(
        self, 
        uploaded_file: UploadedFile, 
        category: str = 'documents',
        subfolder: Optional[str] = None,
        custom_name: Optional[str] = None,
        validate: bool = True
    ) -> Dict[str, Union[str, int]]:
        """
        Save uploaded file to organized storage
        
        Args:
            uploaded_file: Django UploadedFile object
            category: File category ('documents', 'images', etc.)
            subfolder: Optional subfolder within category
            custom_name: Optional custom filename (without extension)
            validate: Whether to validate file type and size
            
        Returns:
            Dict containing file information:
            {
                'file_path': 'relative/path/to/file.ext',
                'file_url': '/files/relative/path/to/file.ext',
                'file_name': 'original_name.ext',
                'file_size': 12345,
                'file_type': 'pdf',
                'mime_type': 'application/pdf',
                'file_hash': 'sha256_hash',
                'storage_path': '/absolute/path/to/file.ext'
            }
            
        Raises:
            ValidationError: If file validation fails
            OSError: If file cannot be saved
        """
        if validate:
            self._validate_file(uploaded_file, category)
        
        # Generate file path
        file_info = self._generate_file_path(
            uploaded_file, category, subfolder, custom_name
        )
        
        # Ensure directory exists
        file_info['storage_path'].parent.mkdir(parents=True, exist_ok=True)
        
        # Save file and calculate hash
        file_hash = self._save_file_with_hash(uploaded_file, file_info['storage_path'])
        file_info['file_hash'] = file_hash
        
        logger.info(f"File saved: {file_info['file_path']} ({file_info['file_size']} bytes)")
        
        return file_info
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_path: Relative path to file
            
        Returns:
            bool: True if file was deleted, False if not found
        """
        if not file_path:
            return False
        
        # Security check: ensure path is within storage root
        full_path = self._get_secure_path(file_path)
        if not full_path:
            logger.warning(f"Attempted to delete file outside storage root: {file_path}")
            return False
        
        try:
            if full_path.exists() and full_path.is_file():
                full_path.unlink()
                logger.info(f"File deleted: {file_path}")
                
                # Clean up empty directories
                self._cleanup_empty_directories(full_path.parent)
                return True
        except OSError as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
        
        return False
    
    def get_file_info(self, file_path: str) -> Optional[Dict[str, Union[str, int, bool]]]:
        """
        Get information about a stored file
        
        Args:
            file_path: Relative path to file
            
        Returns:
            Dict with file information or None if file not found
        """
        if not file_path:
            return None
        
        full_path = self._get_secure_path(file_path)
        if not full_path or not full_path.exists():
            return None
        
        try:
            stat = full_path.stat()
            file_type = file_path.split('.')[-1].lower() if '.' in file_path else ''
            mime_type, _ = mimetypes.guess_type(str(full_path))
            
            return {
                'file_path': file_path,
                'file_url': self.storage_url + file_path,
                'file_name': full_path.name,
                'file_size': stat.st_size,
                'file_type': file_type,
                'mime_type': mime_type or 'application/octet-stream',
                'created_at': datetime.fromtimestamp(stat.st_ctime),
                'modified_at': datetime.fromtimestamp(stat.st_mtime),
                'exists': True,
                'readable': os.access(full_path, os.R_OK),
                'storage_path': str(full_path)
            }
        except OSError as e:
            logger.error(f"Failed to get file info for {file_path}: {e}")
            return None
    
    def validate_file(self, uploaded_file: UploadedFile, category: str = 'documents') -> bool:
        """
        Validate file type and size
        
        Args:
            uploaded_file: Django UploadedFile object
            category: File category for validation rules
            
        Returns:
            bool: True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        self._validate_file(uploaded_file, category)
        return True
    
    def get_file_url(self, file_path: str) -> str:
        """
        Get public URL for file
        
        Args:
            file_path: Relative path to file
            
        Returns:
            str: Public URL for file access
        """
        if not file_path:
            return ''
        return self.storage_url + file_path
    
    def move_file(self, old_path: str, new_path: str) -> bool:
        """
        Move file to new location within storage
        
        Args:
            old_path: Current relative path
            new_path: New relative path
            
        Returns:
            bool: True if moved successfully
        """
        old_full_path = self._get_secure_path(old_path)
        new_full_path = self._get_secure_path(new_path)
        
        if not old_full_path or not new_full_path:
            return False
        
        if not old_full_path.exists():
            return False
        
        try:
            # Ensure new directory exists
            new_full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Move file
            old_full_path.rename(new_full_path)
            
            # Clean up old directory if empty
            self._cleanup_empty_directories(old_full_path.parent)
            
            logger.info(f"File moved: {old_path} -> {new_path}")
            return True
        except OSError as e:
            logger.error(f"Failed to move file {old_path} to {new_path}: {e}")
            return False
    
    def get_storage_stats(self) -> Dict[str, Union[int, str]]:
        """
        Get storage statistics
        
        Returns:
            Dict with storage statistics
        """
        total_size = 0
        file_count = 0
        
        try:
            for root, dirs, files in os.walk(self.storage_root):
                for file in files:
                    file_path = Path(root) / file
                    try:
                        total_size += file_path.stat().st_size
                        file_count += 1
                    except OSError:
                        continue
        except OSError:
            pass
        
        return {
            'total_files': file_count,
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'storage_root': str(self.storage_root),
            'storage_url': self.storage_url
        }
    
    def cleanup_orphaned_files(self, valid_paths: List[str]) -> Dict[str, int]:
        """
        Clean up files not referenced in database
        
        Args:
            valid_paths: List of file paths that should be kept
            
        Returns:
            Dict with cleanup statistics
        """
        valid_paths_set = set(valid_paths)
        deleted_count = 0
        deleted_size = 0
        
        try:
            for root, dirs, files in os.walk(self.storage_root):
                for file in files:
                    file_path = Path(root) / file
                    relative_path = str(file_path.relative_to(self.storage_root))
                    
                    if relative_path not in valid_paths_set:
                        try:
                            file_size = file_path.stat().st_size
                            file_path.unlink()
                            deleted_count += 1
                            deleted_size += file_size
                            logger.info(f"Deleted orphaned file: {relative_path}")
                        except OSError as e:
                            logger.error(f"Failed to delete orphaned file {relative_path}: {e}")
        except OSError as e:
            logger.error(f"Failed to cleanup orphaned files: {e}")
        
        return {
            'deleted_count': deleted_count,
            'deleted_size_bytes': deleted_size,
            'deleted_size_mb': round(deleted_size / (1024 * 1024), 2)
        }
    
    def _validate_file(self, uploaded_file: UploadedFile, category: str) -> None:
        """
        Internal file validation
        
        Args:
            uploaded_file: Django UploadedFile object
            category: File category
            
        Raises:
            ValidationError: If validation fails
        """
        if not uploaded_file or not uploaded_file.name:
            raise ValidationError("No file provided")
        
        # Get file extension
        file_ext = uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
        
        # Validate file type
        allowed_types = self.allowed_types.get(category, [])
        if allowed_types and file_ext not in allowed_types:
            raise ValidationError(
                f"File type '{file_ext}' not allowed for category '{category}'. "
                f"Allowed types: {', '.join(allowed_types)}"
            )
        
        # Additional check for dangerous file types
        dangerous_types = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'sh']
        if file_ext in dangerous_types:
            raise ValidationError(f"File type '{file_ext}' is not allowed for security reasons")
        
        # Validate file size
        max_size = self.max_file_sizes.get(category, self.max_file_sizes.get('document', 10 * 1024 * 1024))
        if uploaded_file.size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            current_size_mb = uploaded_file.size / (1024 * 1024)
            raise ValidationError(
                f"File size ({current_size_mb:.2f}MB) exceeds maximum allowed size "
                f"({max_size_mb:.2f}MB) for category '{category}'"
            )
        
        # Validate filename for security
        if self._is_dangerous_filename(uploaded_file.name):
            raise ValidationError("Filename contains dangerous characters")
    
    def _generate_file_path(
        self, 
        uploaded_file: UploadedFile, 
        category: str,
        subfolder: Optional[str] = None,
        custom_name: Optional[str] = None
    ) -> Dict[str, Union[str, int, Path]]:
        """
        Generate organized file path
        
        Args:
            uploaded_file: Django UploadedFile object
            category: File category
            subfolder: Optional subfolder
            custom_name: Optional custom filename
            
        Returns:
            Dict with file path information
        """
        now = datetime.now()
        
        # Get path template
        path_template = self.storage_structure.get(category, f'{category}/')
        
        # Format path with date
        relative_dir = path_template.format(
            year=now.year,
            month=f"{now.month:02d}",
            day=f"{now.day:02d}"
        )
        
        # Add subfolder if provided
        if subfolder:
            relative_dir = os.path.join(relative_dir, subfolder)
        
        # Generate filename
        file_ext = uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
        if custom_name:
            filename = f"{custom_name}.{file_ext}" if file_ext else custom_name
        else:
            # Generate unique filename
            unique_id = uuid.uuid4().hex
            original_name = os.path.splitext(uploaded_file.name)[0]
            # Sanitize original name
            safe_name = self._sanitize_filename(original_name)[:50]  # Limit length
            filename = f"{safe_name}_{unique_id}.{file_ext}" if file_ext else f"{safe_name}_{unique_id}"
        
        # Construct paths
        relative_path = os.path.join(relative_dir, filename).replace('\\', '/')
        storage_path = self.storage_root / relative_path
        file_url = self.storage_url + relative_path
        
        # Get MIME type
        mime_type, _ = mimetypes.guess_type(uploaded_file.name)
        
        return {
            'file_path': relative_path,
            'file_url': file_url,
            'file_name': uploaded_file.name,
            'file_size': uploaded_file.size,
            'file_type': file_ext,
            'mime_type': mime_type or 'application/octet-stream',
            'storage_path': storage_path
        }
    
    def _save_file_with_hash(self, uploaded_file: UploadedFile, storage_path: Path) -> str:
        """
        Save file and calculate SHA256 hash
        
        Args:
            uploaded_file: Django UploadedFile object
            storage_path: Absolute path to save file
            
        Returns:
            str: SHA256 hash of file content
        """
        hash_sha256 = hashlib.sha256()
        
        with open(storage_path, 'wb') as destination:
            for chunk in uploaded_file.chunks():
                hash_sha256.update(chunk)
                destination.write(chunk)
        
        return hash_sha256.hexdigest()
    
    def _get_secure_path(self, file_path: str) -> Optional[Path]:
        """
        Get secure absolute path, preventing path traversal
        
        Args:
            file_path: Relative file path
            
        Returns:
            Path object or None if path is unsafe
        """
        if not file_path:
            return None
        
        try:
            # Normalize path and resolve
            full_path = (self.storage_root / file_path).resolve()
            
            # Ensure path is within storage root
            if not str(full_path).startswith(str(self.storage_root.resolve())):
                return None
            
            return full_path
        except (OSError, ValueError):
            return None
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename for safe storage
        
        Args:
            filename: Original filename
            
        Returns:
            str: Sanitized filename
        """
        # Remove dangerous characters
        dangerous_chars = '<>:"/\\|?*'
        for char in dangerous_chars:
            filename = filename.replace(char, '_')
        
        # Remove control characters
        filename = ''.join(char for char in filename if ord(char) >= 32)
        
        # Limit length and strip whitespace
        filename = filename.strip()[:100]
        
        # Ensure filename is not empty
        if not filename:
            filename = 'unnamed'
        
        return filename
    
    def _is_dangerous_filename(self, filename: str) -> bool:
        """
        Check if filename is potentially dangerous
        
        Args:
            filename: Filename to check
            
        Returns:
            bool: True if filename is dangerous
        """
        dangerous_patterns = [
            '..', '~', '$', '`', '|', ';', '&', '(', ')', '{', '}',
            'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
            'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
            'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ]
        
        filename_upper = filename.upper()
        return any(pattern in filename_upper for pattern in dangerous_patterns)
    
    def _cleanup_empty_directories(self, directory: Path) -> None:
        """
        Remove empty directories up the tree
        
        Args:
            directory: Directory to start cleanup from
        """
        try:
            # Don't remove storage root
            if directory == self.storage_root:
                return
            
            # Check if directory is empty
            if directory.exists() and directory.is_dir() and not any(directory.iterdir()):
                directory.rmdir()
                # Recursively clean parent directories
                self._cleanup_empty_directories(directory.parent)
        except OSError:
            # Ignore errors during cleanup
            pass


# Global instance
file_storage = FileStorageService()