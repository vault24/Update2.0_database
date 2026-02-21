"""
Teacher Views
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import (
    Teacher,
    TeacherExperience,
    TeacherEducation,
    TeacherPublication,
    TeacherResearch,
    TeacherAward
)
from .serializers import (
    TeacherListSerializer,
    TeacherDetailSerializer,
    TeacherCreateSerializer,
    TeacherUpdateSerializer,
    TeacherProfileSerializer,
    TeacherExperienceSerializer,
    TeacherEducationSerializer,
    TeacherPublicationSerializer,
    TeacherResearchSerializer,
    TeacherAwardSerializer
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
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """
        Get complete teacher profile with all related data
        GET /api/teachers/{id}/profile/
        
        Returns teacher info with experiences, education, publications, research, and awards
        """
        teacher = self.get_object()
        serializer = TeacherProfileSerializer(teacher)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_profile(self, request, pk=None):
        """
        Update teacher profile fields (headline, about, skills, etc.)
        PATCH /api/teachers/{id}/update_profile/
        
        Accepts: headline, about, skills, specializations, coverPhoto
        """
        teacher = self.get_object()
        
        allowed_fields = ['headline', 'about', 'skills', 'specializations', 'coverPhoto']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        for field, value in update_data.items():
            setattr(teacher, field, value)
        
        teacher.save()
        serializer = TeacherProfileSerializer(teacher)
        return Response(serializer.data)
    
    # Experience endpoints
    @action(detail=True, methods=['post'])
    def add_experience(self, request, pk=None):
        """Add work experience"""
        teacher = self.get_object()
        serializer = TeacherExperienceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(teacher=teacher)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='experience/(?P<exp_id>[^/.]+)')
    def update_experience(self, request, pk=None, exp_id=None):
        """Update work experience"""
        teacher = self.get_object()
        try:
            experience = TeacherExperience.objects.get(id=exp_id, teacher=teacher)
        except TeacherExperience.DoesNotExist:
            return Response({'error': 'Experience not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TeacherExperienceSerializer(experience, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='experience/(?P<exp_id>[^/.]+)')
    def delete_experience(self, request, pk=None, exp_id=None):
        """Delete work experience"""
        teacher = self.get_object()
        try:
            experience = TeacherExperience.objects.get(id=exp_id, teacher=teacher)
            experience.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TeacherExperience.DoesNotExist:
            return Response({'error': 'Experience not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Education endpoints
    @action(detail=True, methods=['post'])
    def add_education(self, request, pk=None):
        """Add education"""
        teacher = self.get_object()
        serializer = TeacherEducationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(teacher=teacher)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='education/(?P<edu_id>[^/.]+)')
    def update_education(self, request, pk=None, edu_id=None):
        """Update education"""
        teacher = self.get_object()
        try:
            education = TeacherEducation.objects.get(id=edu_id, teacher=teacher)
        except TeacherEducation.DoesNotExist:
            return Response({'error': 'Education not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TeacherEducationSerializer(education, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='education/(?P<edu_id>[^/.]+)')
    def delete_education(self, request, pk=None, edu_id=None):
        """Delete education"""
        teacher = self.get_object()
        try:
            education = TeacherEducation.objects.get(id=edu_id, teacher=teacher)
            education.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TeacherEducation.DoesNotExist:
            return Response({'error': 'Education not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Publication endpoints
    @action(detail=True, methods=['post'])
    def add_publication(self, request, pk=None):
        """Add publication"""
        teacher = self.get_object()
        serializer = TeacherPublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(teacher=teacher)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='publication/(?P<pub_id>[^/.]+)')
    def update_publication(self, request, pk=None, pub_id=None):
        """Update publication"""
        teacher = self.get_object()
        try:
            publication = TeacherPublication.objects.get(id=pub_id, teacher=teacher)
        except TeacherPublication.DoesNotExist:
            return Response({'error': 'Publication not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TeacherPublicationSerializer(publication, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='publication/(?P<pub_id>[^/.]+)')
    def delete_publication(self, request, pk=None, pub_id=None):
        """Delete publication"""
        teacher = self.get_object()
        try:
            publication = TeacherPublication.objects.get(id=pub_id, teacher=teacher)
            publication.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TeacherPublication.DoesNotExist:
            return Response({'error': 'Publication not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Research endpoints
    @action(detail=True, methods=['post'])
    def add_research(self, request, pk=None):
        """Add research project"""
        teacher = self.get_object()
        serializer = TeacherResearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(teacher=teacher)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='research/(?P<res_id>[^/.]+)')
    def update_research(self, request, pk=None, res_id=None):
        """Update research project"""
        teacher = self.get_object()
        try:
            research = TeacherResearch.objects.get(id=res_id, teacher=teacher)
        except TeacherResearch.DoesNotExist:
            return Response({'error': 'Research not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TeacherResearchSerializer(research, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='research/(?P<res_id>[^/.]+)')
    def delete_research(self, request, pk=None, res_id=None):
        """Delete research project"""
        teacher = self.get_object()
        try:
            research = TeacherResearch.objects.get(id=res_id, teacher=teacher)
            research.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TeacherResearch.DoesNotExist:
            return Response({'error': 'Research not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Award endpoints
    @action(detail=True, methods=['post'])
    def add_award(self, request, pk=None):
        """Add award"""
        teacher = self.get_object()
        serializer = TeacherAwardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(teacher=teacher)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='award/(?P<award_id>[^/.]+)')
    def update_award(self, request, pk=None, award_id=None):
        """Update award"""
        teacher = self.get_object()
        try:
            award = TeacherAward.objects.get(id=award_id, teacher=teacher)
        except TeacherAward.DoesNotExist:
            return Response({'error': 'Award not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TeacherAwardSerializer(award, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='award/(?P<award_id>[^/.]+)')
    def delete_award(self, request, pk=None, award_id=None):
        """Delete award"""
        teacher = self.get_object()
        try:
            award = TeacherAward.objects.get(id=award_id, teacher=teacher)
            award.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TeacherAward.DoesNotExist:
            return Response({'error': 'Award not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """
        Get teacher statistics
        GET /api/teachers/{id}/stats/
        
        Returns attendance stats, classes conducted, and student satisfaction
        """
        from django.db.models import Avg, Count
        from apps.attendance.models import AttendanceRecord
        from apps.class_routines.models import ClassRoutine
        
        teacher = self.get_object()
        
        # Get attendance records for this teacher's classes
        attendance_records = AttendanceRecord.objects.filter(
            recorded_by=teacher.user,
            is_live=True
        )
        
        # Calculate average attendance percentage
        total_records = attendance_records.count()
        present_records = attendance_records.filter(status='present').count()
        average_attendance = (present_records / total_records * 100) if total_records > 0 else 0
        
        # Count classes conducted (unique dates)
        classes_conducted = attendance_records.values('date').distinct().count()
        
        # Get class routines assigned to this teacher
        class_routines = ClassRoutine.objects.filter(
            teacher=teacher.user,
            is_active=True
        ).count()
        
        # Calculate student satisfaction (placeholder - would need feedback system)
        # For now, return a calculated value based on attendance
        student_satisfaction = min(5.0, (average_attendance / 20) + 0.5)
        
        # Get total unique students
        total_students = attendance_records.values('student').distinct().count()
        
        return Response({
            'average_attendance': round(average_attendance, 1),
            'classes_conducted': classes_conducted,
            'student_satisfaction': round(student_satisfaction, 1),
            'total_students': total_students,
            'class_routines': class_routines
        })
