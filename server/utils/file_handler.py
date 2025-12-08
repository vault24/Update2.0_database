"""
File Handler Utility
Handles file uploads to client/assets/images/ directory
"""
import os
import uuid
from pathlib import Path


def save_uploaded_file(uploaded_file, subdirectory):
    """
    Save uploaded file to client/assets/images/{subdirectory}/
    
    Args:
        uploaded_file: Django UploadedFile object
        subdirectory: 'students' or 'documents'
    
    Returns:
        str: Relative path (e.g., "students/photo_123.jpg")
    
    Raises:
        ValueError: If subdirectory is invalid
    """
    # Validate subdirectory
    valid_subdirs = ['students', 'documents']
    if subdirectory not in valid_subdirs:
        raise ValueError(f"Invalid subdirectory. Must be one of: {valid_subdirs}")
    
    # Get project root (server directory)
    base_dir = Path(__file__).resolve().parent.parent
    
    # Navigate to client/assets/images/
    upload_dir = base_dir.parent / 'client' / 'assets' / 'images' / subdirectory
    
    # Create directory if it doesn't exist
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    ext = uploaded_file.name.split('.')[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Full file path
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    
    # Return relative path for database
    return f"{subdirectory}/{filename}"


def delete_file(relative_path):
    """
    Delete file from client/assets/images/
    
    Args:
        relative_path: Path like "students/photo_123.jpg" or "documents/doc_456.pdf"
    
    Returns:
        bool: True if file was deleted, False if file didn't exist
    """
    if not relative_path:
        return False
    
    base_dir = Path(__file__).resolve().parent.parent
    file_path = base_dir.parent / 'client' / 'assets' / 'images' / relative_path
    
    if file_path.exists() and file_path.is_file():
        file_path.unlink()
        return True
    
    return False


def validate_file_type(uploaded_file, allowed_types):
    """
    Validate file type based on extension
    
    Args:
        uploaded_file: Django UploadedFile object
        allowed_types: List of allowed extensions (e.g., ['jpg', 'png'])
    
    Returns:
        bool: True if valid, False otherwise
    """
    if not uploaded_file or not uploaded_file.name:
        return False
    
    ext = uploaded_file.name.split('.')[-1].lower()
    return ext in [t.lower() for t in allowed_types]


def validate_file_size(uploaded_file, max_size_mb):
    """
    Validate file size
    
    Args:
        uploaded_file: Django UploadedFile object
        max_size_mb: Maximum size in megabytes
    
    Returns:
        bool: True if valid, False otherwise
    """
    if not uploaded_file:
        return False
    
    max_size_bytes = max_size_mb * 1024 * 1024
    return uploaded_file.size <= max_size_bytes
