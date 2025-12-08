"""
Teacher Views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Teacher
from .serializers import (
    TeacherListSerializer,
    TeacherDetailSerializer,
    TeacherCreateSerializer,
    TeacherUpdateSerializer
)


class TeacherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Teacher CRUD operations
    
    Endpoints:
    - GET /api/teachers/ - List all teachers
    - POST /api/teachers/ - Create new teacher
    - GET /api/teachers/{id}/ - Get teacher details
    - PUT /api/teachers/{id}/ - Update teacher
    - DELETE /api/teachers/{id}/ - Delete teacher
    """
    queryset = Teacher.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'employmentStatus', 'designation']
    search_fields = ['fullNameEnglish', 'fullNameBangla', 'email', 'designation']
    ordering_fields = ['createdAt', 'fullNameEnglish', 'joiningDate']
    ordering = ['fullNameEnglish']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TeacherListSerializer
        elif self.action == 'create':
            return TeacherCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TeacherUpdateSerializer
        else:
            return TeacherDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new teacher
        POST /api/teachers/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return complete teacher data
        teacher = Teacher.objects.get(pk=serializer.instance.pk)
        response_serializer = TeacherDetailSerializer(teacher)
        
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update teacher
        PUT /api/teachers/{id}/
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return complete teacher data
        teacher = Teacher.objects.get(pk=instance.pk)
        response_serializer = TeacherDetailSerializer(teacher)
        
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search teachers by name, email, or designation
        GET /api/teachers/search/?q={query}
        """
        query = request.query_params.get('q', '')
        
        if not query:
            return Response({
                'error': 'Search query parameter "q" is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Search in multiple fields (case-insensitive)
        teachers = Teacher.objects.filter(
            Q(fullNameEnglish__icontains=query) |
            Q(fullNameBangla__icontains=query) |
            Q(email__icontains=query) |
            Q(designation__icontains=query)
        )
        
        serializer = TeacherListSerializer(teachers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def upload_photo(self, request, pk=None):
        """
        Upload teacher profile photo
        POST /api/teachers/{id}/upload-photo/
        
        Accepts: multipart/form-data with 'photo' field
        """
        from utils.file_handler import (
            save_uploaded_file,
            validate_file_type,
            validate_file_size,
            delete_file
        )
        
        teacher = self.get_object()
        
        if 'photo' not in request.FILES:
            return Response({
                'error': 'No photo file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        photo_file = request.FILES['photo']
        
        # Validate file type
        if not validate_file_type(photo_file, ['jpg', 'jpeg', 'png']):
            return Response({
                'error': 'Invalid file type',
                'details': 'Only JPG and PNG images are allowed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 5MB)
        if not validate_file_size(photo_file, 5):
            return Response({
                'error': 'File too large',
                'details': 'Maximum file size is 5MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete old photo if exists
        if teacher.profilePhoto:
            delete_file(teacher.profilePhoto)
        
        # Save new photo
        try:
            relative_path = save_uploaded_file(photo_file, 'teachers')
            teacher.profilePhoto = relative_path
            teacher.save()
            
            serializer = TeacherDetailSerializer(teacher)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'error': 'Failed to upload photo',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
