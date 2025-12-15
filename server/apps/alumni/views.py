"""
Alumni Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from .models import Alumni
from .serializers import (
    AlumniSerializer,
    AlumniCreateSerializer,
    AlumniUpdateSerializer,
    AlumniStatsSerializer,
    AddCareerPositionSerializer,
    UpdateSupportCategorySerializer
)


class AlumniViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Alumni CRUD operations
    
    Provides:
    - list: GET /api/alumni/
    - create: POST /api/alumni/
    - retrieve: GET /api/alumni/{id}/
    - update: PUT /api/alumni/{id}/
    - partial_update: PATCH /api/alumni/{id}/
    
    Custom actions:
    - add_career_position: POST /api/alumni/{id}/add-career-position/
    - update_support_category: PUT /api/alumni/{id}/update-support-category/
    - search: GET /api/alumni/search/?q={query}
    - stats: GET /api/alumni/stats/
    """
    queryset = Alumni.objects.select_related('student', 'student__department').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alumniType', 'currentSupportCategory', 'graduationYear', 'student__department']
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action
        """
        if self.action == 'create':
            return AlumniCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AlumniUpdateSerializer
        elif self.action == 'add_career_position':
            return AddCareerPositionSerializer
        elif self.action == 'update_support_category':
            return UpdateSupportCategorySerializer
        elif self.action == 'stats':
            return AlumniStatsSerializer
        else:
            return AlumniSerializer
    
    def list(self, request, *args, **kwargs):
        """
        List alumni with filtering
        GET /api/alumni/
        """
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """
        Create alumni record
        POST /api/alumni/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return complete alumni data
        alumni = Alumni.objects.get(pk=serializer.instance.pk)
        response_serializer = AlumniSerializer(alumni)
        
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get alumni details
        GET /api/alumni/{id}/
        """
        return super().retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Update alumni
        PUT /api/alumni/{id}/
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return complete alumni data
        alumni = Alumni.objects.get(pk=instance.pk)
        response_serializer = AlumniSerializer(alumni)
        
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_career_position(self, request, pk=None):
        """
        Add career position to alumni
        POST /api/alumni/{id}/add-career-position/
        
        Body: {
            "company": "Company Name",
            "position": "Position Title",
            "startDate": "2024-01-01",
            "endDate": "2024-12-31" (optional),
            "description": "Job description" (optional)
        }
        """
        alumni = self.get_object()
        serializer = AddCareerPositionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Add career position
        position_data = serializer.validated_data
        # Convert date objects to ISO format strings
        position_data['startDate'] = position_data['startDate'].isoformat()
        if position_data.get('endDate'):
            position_data['endDate'] = position_data['endDate'].isoformat()
        
        alumni.add_career_position(position_data)
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['put'])
    def update_support_category(self, request, pk=None):
        """
        Update support category
        PUT /api/alumni/{id}/update-support-category/
        
        Body: {
            "category": "receiving_support",
            "notes": "Optional notes"
        }
        """
        alumni = self.get_object()
        serializer = UpdateSupportCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update support category
        alumni.update_support_category(
            serializer.validated_data['category'],
            serializer.validated_data.get('notes', '')
        )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search alumni by name, department, or graduation year
        GET /api/alumni/search/?q={query}
        
        Query params:
        - q: Search query (searches in name, department)
        - department: Filter by department ID (optional)
        - graduationYear: Filter by graduation year (optional)
        """
        from django.db.models import Q
        
        query = request.query_params.get('q', '')
        department = request.query_params.get('department')
        graduation_year = request.query_params.get('graduationYear')
        
        # Start with all alumni
        alumni = Alumni.objects.all()
        
        # Apply text search if query provided
        if query:
            alumni = alumni.filter(
                Q(student__fullNameEnglish__icontains=query) |
                Q(student__fullNameBangla__icontains=query) |
                Q(student__department__name__icontains=query) |
                Q(student__department__code__icontains=query)
            )
        
        # Apply department filter if provided
        if department:
            alumni = alumni.filter(student__department_id=department)
        
        # Apply graduation year filter if provided
        if graduation_year:
            try:
                year = int(graduation_year)
                alumni = alumni.filter(graduationYear=year)
            except ValueError:
                return Response(
                    {
                        'error': 'Invalid graduation year',
                        'details': 'Graduation year must be a valid integer'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Order by graduation year (most recent first)
        alumni = alumni.order_by('-graduationYear', 'student__fullNameEnglish')
        
        serializer = AlumniSerializer(alumni, many=True)
        return Response({
            'count': alumni.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get alumni statistics
        GET /api/alumni/stats/
        
        Returns statistics grouped by:
        - Alumni type
        - Support category
        - Graduation year
        - Position type
        - Department
        """
        # Total alumni
        total_alumni = Alumni.objects.count()
        recent_alumni = Alumni.objects.filter(alumniType='recent').count()
        established_alumni = Alumni.objects.filter(alumniType='established').count()
        
        # By support category
        by_support_category = dict(
            Alumni.objects.values('currentSupportCategory')
            .annotate(count=Count('pk'))
            .values_list('currentSupportCategory', 'count')
        )
        
        # By graduation year
        by_graduation_year = dict(
            Alumni.objects.values('graduationYear')
            .annotate(count=Count('pk'))
            .values_list('graduationYear', 'count')
        )
        
        # Convert year keys to strings
        by_graduation_year = {str(k): v for k, v in by_graduation_year.items()}
        
        # By department
        by_department = {}
        alumni_with_dept = Alumni.objects.select_related('student__department').all()
        for alumni in alumni_with_dept:
            dept_name = alumni.student.department.name
            by_department[dept_name] = by_department.get(dept_name, 0) + 1
        
        # By position type (from current position)
        by_position_type = {}
        alumni_with_positions = Alumni.objects.exclude(currentPosition__isnull=True)
        for alumni in alumni_with_positions:
            if alumni.currentPosition and 'positionTitle' in alumni.currentPosition:
                position = alumni.currentPosition['positionTitle']
                by_position_type[position] = by_position_type.get(position, 0) + 1
        
        stats_data = {
            'total': total_alumni,
            'recent': recent_alumni,
            'established': established_alumni,
            'bySupport': by_support_category,
            'byPosition': by_position_type,
            'byYear': by_graduation_year,
            'byDepartment': by_department,
        }
        
        return Response(stats_data)
    
    @action(detail=True, methods=['post'])
    def skills(self, request, pk=None):
        """
        Add skill to alumni
        POST /api/alumni/{id}/skills/
        """
        alumni = self.get_object()
        skill_data = request.data
        
        # Validate required fields
        if not skill_data.get('name'):
            return Response(
                {'error': 'Skill name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        skill_id = alumni.add_skill(skill_data)
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['put'], url_path='skills/(?P<skill_id>[^/.]+)')
    def update_skill(self, request, pk=None, skill_id=None):
        """
        Update skill
        PUT /api/alumni/{id}/skills/{skill_id}/
        """
        alumni = self.get_object()
        skill_data = request.data
        
        if not alumni.update_skill(skill_id, skill_data):
            return Response(
                {'error': 'Skill not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='skills/(?P<skill_id>[^/.]+)')
    def delete_skill(self, request, pk=None, skill_id=None):
        """
        Delete skill
        DELETE /api/alumni/{id}/skills/{skill_id}/
        """
        alumni = self.get_object()
        
        if not alumni.delete_skill(skill_id):
            return Response(
                {'error': 'Skill not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def highlights(self, request, pk=None):
        """
        Add career highlight to alumni
        POST /api/alumni/{id}/highlights/
        """
        alumni = self.get_object()
        highlight_data = request.data
        
        # Validate required fields
        required_fields = ['title', 'description', 'date']
        for field in required_fields:
            if not highlight_data.get(field):
                return Response(
                    {'error': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        highlight_id = alumni.add_highlight(highlight_data)
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['put'], url_path='highlights/(?P<highlight_id>[^/.]+)')
    def update_highlight(self, request, pk=None, highlight_id=None):
        """
        Update career highlight
        PUT /api/alumni/{id}/highlights/{highlight_id}/
        """
        alumni = self.get_object()
        highlight_data = request.data
        
        if not alumni.update_highlight(highlight_id, highlight_data):
            return Response(
                {'error': 'Highlight not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='highlights/(?P<highlight_id>[^/.]+)')
    def delete_highlight(self, request, pk=None, highlight_id=None):
        """
        Delete career highlight
        DELETE /api/alumni/{id}/highlights/{highlight_id}/
        """
        alumni = self.get_object()
        
        if not alumni.delete_highlight(highlight_id):
            return Response(
                {'error': 'Highlight not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['put'], url_path='career_positions/(?P<career_id>[^/.]+)')
    def update_career_position(self, request, pk=None, career_id=None):
        """
        Update career position
        PUT /api/alumni/{id}/career_positions/{career_id}/
        """
        alumni = self.get_object()
        career_data = request.data
        
        if not alumni.update_career_position(career_id, career_data):
            return Response(
                {'error': 'Career position not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='career_positions/(?P<career_id>[^/.]+)')
    def delete_career_position(self, request, pk=None, career_id=None):
        """
        Delete career position
        DELETE /api/alumni/{id}/career_positions/{career_id}/
        """
        alumni = self.get_object()
        
        if not alumni.delete_career_position(career_id):
            return Response(
                {'error': 'Career position not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['patch'])
    def profile(self, request, pk=None):
        """
        Update alumni profile information
        PATCH /api/alumni/{id}/profile/
        """
        alumni = self.get_object()
        
        # Update profile fields
        profile_fields = ['bio', 'linkedinUrl', 'portfolioUrl']
        for field in profile_fields:
            if field in request.data:
                setattr(alumni, field, request.data[field])
        
        # Update student fields if provided
        student_field_mapping = {
            'email': 'email',
            'phone': 'mobileStudent',
            'location': 'presentAddress'
        }
        student_updated = False
        for api_field, model_field in student_field_mapping.items():
            if api_field in request.data:
                if api_field == 'location':
                    # Handle address as a structured field
                    current_address = alumni.student.presentAddress or {}
                    current_address['district'] = request.data[api_field]
                    setattr(alumni.student, model_field, current_address)
                else:
                    setattr(alumni.student, model_field, request.data[api_field])
                student_updated = True
        
        if student_updated:
            alumni.student.save()
        
        alumni.save()
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
