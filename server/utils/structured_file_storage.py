"""
Structured File Storage Service
Provides hierarchical, organized document storage for the SLMS system
"""
import os
import uuid
import hashlib
import mimetypes
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class StructuredFileStorage:
    """
    Hierarchical file storage service with organized structure:
    Documents/
    └── Student_Documents/
        └── {department-code}/
            └── {session}/
                └── {shift}/
                    └── {student-name}_{student-id}/
                        ├── photo.jpg
                        ├── birth_certificate.pdf
                        └── ...
    """
    
    # Document type configurations
    DOCUMENT_TYPES = {
        'student': 'Student_Documents',
        'teacher': 'Teacher_Documents',
        'alumni': 'Alumni_Documents',
        'department': 'Department_Documents',
        'system': 'System_Documents',
    }
    
    # Standardized document categories and their file naming
    DOCUMENT_CATEGORIES = {
        'photo': {'extensions': ['jpg', 'jpeg', 'png'], 'filename': 'photo'},
        'birth_certificate': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'birth_certificate'},
        'nid': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'nid'},
        'father_nid': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'father_nid'},
        'father_nid_front': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'father_nid_front'},
        'father_nid_back': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'father_nid_back'},
        'mother_nid': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'mother_nid'},
        'mother_nid_front': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'mother_nid_front'},
        'mother_nid_back': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'mother_nid_back'},
        'ssc_marksheet': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'ssc_marksheet'},
        'ssc_certificate': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'ssc_certificate'},
        'transcript': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'transcript'},
        'medical_certificate': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'medical_certificate'},
        'quota_document': {'extensions': ['pdf', 'jpg', 'jpeg', 'png'], 'filename': 'quota_document'},
        'other': {'extensions': ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'], 'filename': None},
    }
    
    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        'photo': 5 * 1024 * 1024,  # 5MB
        'document': 10 * 1024 * 1024,  # 10MB
    }
    
    def __init__(self):
        self.storage_root = getattr(
            settings, 
            'STRUCTURED_STORAGE_ROOT', 
            settings.BASE_DIR / 'storage' / 'Documents'
        )
        self.storage_url = getattr(settings, 'FILE_STORAGE_URL', '/files/')
        
        # Ensure storage root exists
        self.storage_root.mkdir(parents=True, exist_ok=True)
    
    def save_student_document(
        self,
        uploaded_file: UploadedFile,
        student_data: Dict[str, str],
        document_category: str,
        validate: bool = True
    ) -> Dict[str, Union[str, int]]:
        """
        Save student document in structured hierarchy
        
        Args:
            uploaded_file: Django UploadedFile object
            student_data: Dict with keys:
                - department_code: str (e.g., 'computer-technology')
                - session: str (e.g., '2024-2025')
                - shift: str (e.g., '1st-shift')
                - student_name: str (e.g., 'MdMahadi')
                - student_id: str (e.g., 'SIPI-889900')
            document_category: Category from DOCUMENT_CATEGORIES
            validate: Whether to validate file
            
        Returns:
            Dict with file information
        """
        if validate:
            self._validate_file(uploaded_file, document_category)
        
        # Sanitize inputs
        dept_code = self._sanitize_path_component(student_data['department_code'])
        dept_name = self._sanitize_path_component(student_data.get('department_name', ''))
        session = self._sanitize_path_component(student_data['session'])
        shift = self._sanitize_path_component(student_data['shift'])
        student_name = self._sanitize_filename(student_data['student_name'])
        student_id = self._sanitize_filename(student_data['student_id'])
        
        # Build hierarchical path
        # Structure: Student_Documents/dept-code_dept-name/session/shift/student-name_student-id/
        dept_folder = f"{dept_code}_{dept_name}" if dept_name else dept_code
        student_folder = f"{student_name}_{student_id}"
        
        relative_dir = os.path.join(
            self.DOCUMENT_TYPES['student'],
            dept_folder,
            session,
            shift,
            student_folder
        )
        
        # Handle 'other' category with subfolder
        if document_category == 'other':
            relative_dir = os.path.join(relative_dir, 'other_documents')
        
        # Generate filename
        file_info = self._generate_structured_filename(
            uploaded_file, document_category, relative_dir
        )
        
        # Ensure directory exists
        file_info['storage_path'].parent.mkdir(parents=True, exist_ok=True)
        
        # Save file and calculate hash
        file_hash = self._save_file_with_hash(uploaded_file, file_info['storage_path'])
        file_info['file_hash'] = file_hash
        
        # Add metadata
        file_info.update({
            'document_type': 'student',
            'department_code': dept_code,
            'session': session,
            'shift': shift,
            'owner_name': student_name,
            'owner_id': student_id,
            'document_category': document_category,
        })
        
        logger.info(
            f"Student document saved: {file_info['file_path']} "
            f"({file_info['file_size']} bytes)"
        )
        
        return file_info
    
    def save_teacher_document(
        self,
        uploaded_file: UploadedFile,
        teacher_data: Dict[str, str],
        document_category: str,
        validate: bool = True
    ) -> Dict[str, Union[str, int]]:
        """
        Save teacher document in structured hierarchy
        
        Args:
            uploaded_file: Django UploadedFile object
            teacher_data: Dict with keys:
                - department_code: str
                - teacher_name: str
                - teacher_id: str
            document_category: Category from DOCUMENT_CATEGORIES
            validate: Whether to validate file
            
        Returns:
            Dict with file information
        """
        if validate:
            self._validate_file(uploaded_file, document_category)
        
        # Sanitize inputs
        dept_code = self._sanitize_path_component(teacher_data['department_code'])
        dept_name = self._sanitize_path_component(teacher_data.get('department_name', ''))
        teacher_name = self._sanitize_filename(teacher_data['teacher_name'])
        teacher_id = self._sanitize_filename(teacher_data['teacher_id'])
        
        # Build hierarchical path
        # Structure: Teacher_Documents/dept-code_dept-name/teacher-name_teacher-id/
        dept_folder = f"{dept_code}_{dept_name}" if dept_name else dept_code
        teacher_folder = f"{teacher_name}_{teacher_id}"
        
        relative_dir = os.path.join(
            self.DOCUMENT_TYPES['teacher'],
            dept_folder,
            teacher_folder
        )
        
        # Handle categories with subfolders
        if document_category in ['certificate', 'other']:
            relative_dir = os.path.join(relative_dir, f"{document_category}s")
        
        # Generate filename
        file_info = self._generate_structured_filename(
            uploaded_file, document_category, relative_dir
        )
        
        # Ensure directory exists
        file_info['storage_path'].parent.mkdir(parents=True, exist_ok=True)
        
        # Save file and calculate hash
        file_hash = self._save_file_with_hash(uploaded_file, file_info['storage_path'])
        file_info['file_hash'] = file_hash
        
        # Add metadata
        file_info.update({
            'document_type': 'teacher',
            'department_code': dept_code,
            'owner_name': teacher_name,
            'owner_id': teacher_id,
            'document_category': document_category,
        })
        
        logger.info(
            f"Teacher document saved: {file_info['file_path']} "
            f"({file_info['file_size']} bytes)"
        )
        
        return file_info
    
    def save_alumni_document(
        self,
        uploaded_file: UploadedFile,
        alumni_data: Dict[str, str],
        document_category: str,
        validate: bool = True
    ) -> Dict[str, Union[str, int]]:
        """
        Save alumni document in structured hierarchy
        
        Args:
            uploaded_file: Django UploadedFile object
            alumni_data: Dict with keys:
                - department_code: str
                - graduation_year: str
                - alumni_name: str
                - alumni_id: str
            document_category: Category from DOCUMENT_CATEGORIES
            validate: Whether to validate file
            
        Returns:
            Dict with file information
        """
        if validate:
            self._validate_file(uploaded_file, document_category)
        
        # Sanitize inputs
        dept_code = self._sanitize_path_component(alumni_data['department_code'])
        dept_name = self._sanitize_path_component(alumni_data.get('department_name', ''))
        grad_year = self._sanitize_path_component(alumni_data['graduation_year'])
        alumni_name = self._sanitize_filename(alumni_data['alumni_name'])
        alumni_id = self._sanitize_filename(alumni_data['alumni_id'])
        
        # Build hierarchical path
        # Structure: Alumni_Documents/dept-code_dept-name/alumni-name_alumni-id/
        dept_folder = f"{dept_code}_{dept_name}" if dept_name else dept_code
        alumni_folder = f"{alumni_name}_{alumni_id}"
        
        relative_dir = os.path.join(
            self.DOCUMENT_TYPES['alumni'],
            dept_folder,
            alumni_folder
        )
        
        # Handle categories with subfolders
        if document_category in ['certificate', 'other']:
            relative_dir = os.path.join(relative_dir, f"{document_category}s")
        
        # Generate filename
        file_info = self._generate_structured_filename(
            uploaded_file, document_category, relative_dir
        )
        
        # Ensure directory exists
        file_info['storage_path'].parent.mkdir(parents=True, exist_ok=True)
        
        # Save file and calculate hash
        file_hash = self._save_file_with_hash(uploaded_file, file_info['storage_path'])
        file_info['file_hash'] = file_hash
        
        # Add metadata
        file_info.update({
            'document_type': 'alumni',
            'department_code': dept_code,
            'graduation_year': grad_year,
            'owner_name': alumni_name,
            'owner_id': alumni_id,
            'document_category': document_category,
        })
        
        logger.info(
            f"Alumni document saved: {file_info['file_path']} "
            f"({file_info['file_size']} bytes)"
        )
        
        return file_info
    
    def get_student_documents_path(self, student_data: Dict[str, str]) -> Path:
        """Get the directory path for a student's documents"""
        dept_code = self._sanitize_path_component(student_data['department_code'])
        dept_name = self._sanitize_path_component(student_data.get('department_name', ''))
        session = self._sanitize_path_component(student_data['session'])
        shift = self._sanitize_path_component(student_data['shift'])
        student_name = self._sanitize_filename(student_data['student_name'])
        student_id = self._sanitize_filename(student_data['student_id'])
        
        # Structure: Student_Documents/dept-code_dept-name/session/shift/student-name_student-id/
        dept_folder = f"{dept_code}_{dept_name}" if dept_name else dept_code
        student_folder = f"{student_name}_{student_id}"
        
        return self.storage_root / self.DOCUMENT_TYPES['student'] / dept_folder / session / shift / student_folder
    
    def list_student_documents(self, student_data: Dict[str, str]) -> List[Dict[str, str]]:
        """List all documents for a student"""
        student_path = self.get_student_documents_path(student_data)
        
        if not student_path.exists():
            return []
        
        documents = []
        for file_path in student_path.rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(self.storage_root)
                documents.append({
                    'file_path': str(relative_path).replace('\\', '/'),
                    'file_name': file_path.name,
                    'file_size': file_path.stat().st_size,
                    'file_type': file_path.suffix[1:] if file_path.suffix else '',
                })
        
        return documents
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        if not file_path:
            return False
        
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
        """Get information about a stored file"""
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
    
    def get_file_url(self, file_path: str) -> str:
        """Get public URL for file"""
        if not file_path:
            return ''
        return self.storage_url + file_path
    
    def get_storage_stats(self) -> Dict[str, Union[int, str, Dict]]:
        """Get storage statistics"""
        stats = {
            'total_files': 0,
            'total_size_bytes': 0,
            'by_type': {},
            'storage_root': str(self.storage_root),
        }
        
        try:
            for doc_type, folder_name in self.DOCUMENT_TYPES.items():
                type_path = self.storage_root / folder_name
                if not type_path.exists():
                    continue
                
                type_files = 0
                type_size = 0
                
                for file_path in type_path.rglob('*'):
                    if file_path.is_file():
                        try:
                            type_size += file_path.stat().st_size
                            type_files += 1
                        except OSError:
                            continue
                
                stats['by_type'][doc_type] = {
                    'files': type_files,
                    'size_bytes': type_size,
                    'size_mb': round(type_size / (1024 * 1024), 2),
                }
                
                stats['total_files'] += type_files
                stats['total_size_bytes'] += type_size
            
            stats['total_size_mb'] = round(stats['total_size_bytes'] / (1024 * 1024), 2)
            stats['total_size_gb'] = round(stats['total_size_bytes'] / (1024 * 1024 * 1024), 2)
        
        except OSError as e:
            logger.error(f"Failed to get storage stats: {e}")
        
        return stats
    
    def _validate_file(self, uploaded_file: UploadedFile, document_category: str) -> None:
        """Validate file type and size"""
        if not uploaded_file or not uploaded_file.name:
            raise ValidationError("No file provided")
        
        # Get file extension
        file_ext = uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
        
        # Validate file type for category
        if document_category in self.DOCUMENT_CATEGORIES:
            allowed_exts = self.DOCUMENT_CATEGORIES[document_category]['extensions']
            if file_ext not in allowed_exts:
                raise ValidationError(
                    f"File type '{file_ext}' not allowed for {document_category}. "
                    f"Allowed types: {', '.join(allowed_exts)}"
                )
        
        # Check for dangerous file types
        dangerous_types = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'sh']
        if file_ext in dangerous_types:
            raise ValidationError(f"File type '{file_ext}' is not allowed for security reasons")
        
        # Validate file size
        is_image = file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']
        max_size = self.MAX_FILE_SIZES['photo'] if is_image else self.MAX_FILE_SIZES['document']
        
        if uploaded_file.size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            current_size_mb = uploaded_file.size / (1024 * 1024)
            raise ValidationError(
                f"File size ({current_size_mb:.2f}MB) exceeds maximum allowed size ({max_size_mb:.2f}MB)"
            )
    
    def _generate_structured_filename(
        self,
        uploaded_file: UploadedFile,
        document_category: str,
        relative_dir: str
    ) -> Dict[str, Union[str, int, Path]]:
        """Generate structured filename based on category"""
        file_ext = uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
        
        # Get standardized filename for category
        if document_category in self.DOCUMENT_CATEGORIES:
            category_config = self.DOCUMENT_CATEGORIES[document_category]
            if category_config['filename']:
                filename = f"{category_config['filename']}.{file_ext}"
            else:
                # For 'other' category, use original name with UUID
                safe_name = self._sanitize_filename(os.path.splitext(uploaded_file.name)[0])[:50]
                unique_id = uuid.uuid4().hex[:8]
                filename = f"{safe_name}_{unique_id}.{file_ext}"
        else:
            # Fallback for unknown categories
            safe_name = self._sanitize_filename(os.path.splitext(uploaded_file.name)[0])[:50]
            unique_id = uuid.uuid4().hex[:8]
            filename = f"{safe_name}_{unique_id}.{file_ext}"
        
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
        """Save file and calculate SHA256 hash"""
        hash_sha256 = hashlib.sha256()
        
        with open(storage_path, 'wb') as destination:
            for chunk in uploaded_file.chunks():
                hash_sha256.update(chunk)
                destination.write(chunk)
        
        return hash_sha256.hexdigest()
    
    def _get_secure_path(self, file_path: str) -> Optional[Path]:
        """Get secure absolute path, preventing path traversal"""
        if not file_path:
            return None
        
        try:
            full_path = (self.storage_root / file_path).resolve()
            
            # Ensure path is within storage root
            if not str(full_path).startswith(str(self.storage_root.resolve())):
                return None
            
            return full_path
        except (OSError, ValueError):
            return None
    
    def _sanitize_path_component(self, component: str) -> str:
        """Sanitize path component (folder name)"""
        # Remove dangerous characters
        component = re.sub(r'[<>:"/\\|?*]', '', component)
        # Replace spaces with hyphens
        component = component.replace(' ', '-')
        # Remove control characters
        component = ''.join(char for char in component if ord(char) >= 32)
        # Limit length
        component = component.strip()[:100]
        # Ensure not empty
        if not component:
            component = 'unnamed'
        return component.lower()
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename"""
        # Remove dangerous characters
        dangerous_chars = '<>:"/\\|?*'
        for char in dangerous_chars:
            filename = filename.replace(char, '_')
        
        # Remove control characters
        filename = ''.join(char for char in filename if ord(char) >= 32)
        
        # Replace spaces with underscores
        filename = filename.replace(' ', '')
        
        # Limit length and strip whitespace
        filename = filename.strip()[:100]
        
        # Ensure filename is not empty
        if not filename:
            filename = 'unnamed'
        
        return filename
    
    def _cleanup_empty_directories(self, directory: Path) -> None:
        """Remove empty directories up the tree"""
        try:
            # Don't remove storage root or document type folders
            if directory == self.storage_root or directory.parent == self.storage_root:
                return
            
            # Check if directory is empty
            if directory.exists() and directory.is_dir() and not any(directory.iterdir()):
                directory.rmdir()
                # Recursively clean parent directories
                self._cleanup_empty_directories(directory.parent)
        except OSError:
            pass


# Global instance
structured_storage = StructuredFileStorage()
