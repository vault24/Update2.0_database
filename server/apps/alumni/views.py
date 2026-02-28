"""
Alumni Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
    
    def _get_student_alumni(self, request):
        """
        Helper method to get the alumni profile for the authenticated student
        Returns (student, alumni) tuple or raises appropriate error
        """
        from apps.students.models import Student
        
        student_id = request.user.related_profile_id
        
        if not student_id:
            raise ValueError('No student profile associated with this user')
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            raise ValueError('Student profile does not exist')
        
        try:
            alumni = Alumni.objects.get(student=student)
        except Alumni.DoesNotExist:
            raise ValueError('Alumni profile not found')
        
        return student, alumni
    
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
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_profile(self, request):
        """
        Get current student's alumni profile
        GET /api/alumni/my-profile/
        
        Returns the alumni profile for the authenticated student
        """
        try:
            # Get the student ID from the user's related_profile_id
            student_id = request.user.related_profile_id
            
            if not student_id:
                return Response(
                    {
                        'error': 'Student profile not found',
                        'details': 'No student profile associated with this user'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if alumni profile exists
            try:
                alumni = Alumni.objects.get(student_id=student_id)
                serializer = AlumniSerializer(alumni)
                return Response(serializer.data)
            except Alumni.DoesNotExist:
                return Response(
                    {
                        'error': 'Alumni profile not found',
                        'details': 'You do not have an alumni profile yet. Please contact administration.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {
                    'error': 'Error retrieving profile',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_my_profile(self, request):
        """
        Update current student's alumni profile
        PATCH /api/alumni/update-my-profile/
        
        Allows students to update their own alumni profile
        """
        try:
            # Get the student ID from the user's related_profile_id
            student_id = request.user.related_profile_id
            
            if not student_id:
                return Response(
                    {
                        'error': 'Student profile not found',
                        'details': 'No student profile associated with this user'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get student and alumni profile
            from apps.students.models import Student
            try:
                student = Student.objects.get(id=student_id)
                alumni = Alumni.objects.get(student=student)
            except Student.DoesNotExist:
                return Response(
                    {
                        'error': 'Student not found',
                        'details': 'Student profile does not exist'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            except Alumni.DoesNotExist:
                return Response(
                    {
                        'error': 'Alumni profile not found',
                        'details': 'You do not have an alumni profile yet.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update profile fields
            profile_fields = ['bio', 'linkedinUrl', 'portfolioUrl']
            for field in profile_fields:
                if field in request.data:
                    setattr(alumni, field, request.data[field])
            
            # Update student fields if provided
            student_field_mapping = {
                'email': 'email',
                'phone': 'mobileStudent',
            }
            student_updated = False
            for api_field, model_field in student_field_mapping.items():
                if api_field in request.data:
                    setattr(student, model_field, request.data[api_field])
                    student_updated = True
            
            # Handle location separately
            if 'location' in request.data:
                current_address = student.presentAddress or {}
                current_address['district'] = request.data['location']
                student.presentAddress = current_address
                student_updated = True
            
            if student_updated:
                student.save()
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except Exception as e:
            return Response(
                {
                    'error': 'Error updating profile',
                    'details': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def add_my_career(self, request):
        """
        Add career position to current student's alumni profile
        POST /api/alumni/add-my-career/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            serializer = AddCareerPositionSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Add career position
            position_data = serializer.validated_data
            # Convert date objects to ISO format strings
            position_data['startDate'] = position_data['startDate'].isoformat()
            if position_data.get('endDate'):
                position_data['endDate'] = position_data['endDate'].isoformat()
            
            alumni.add_career_position(position_data)
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['put'], url_path='update-my-career/(?P<career_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def update_my_career(self, request, career_id=None):
        """
        Update career position in current student's alumni profile
        PUT /api/alumni/update-my-career/{career_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            career_data = request.data
            
            if not alumni.update_career_position(career_id, career_data):
                return Response(
                    {'error': 'Career position not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['delete'], url_path='delete-my-career/(?P<career_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def delete_my_career(self, request, career_id=None):
        """
        Delete career position from current student's alumni profile
        DELETE /api/alumni/delete-my-career/{career_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            if not alumni.delete_career_position(career_id):
                return Response(
                    {'error': 'Career position not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def add_my_skill(self, request):
        """
        Add skill to current student's alumni profile
        POST /api/alumni/add-my-skill/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            skill_data = request.data
            
            # Validate required fields
            if not skill_data.get('name'):
                return Response(
                    {'error': 'Skill name is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            skill_id = alumni.add_skill(skill_data)
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['put'], url_path='update-my-skill/(?P<skill_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def update_my_skill(self, request, skill_id=None):
        """
        Update skill in current student's alumni profile
        PUT /api/alumni/update-my-skill/{skill_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            skill_data = request.data
            
            if not alumni.update_skill(skill_id, skill_data):
                return Response(
                    {'error': 'Skill not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except AttributeError:
            return Response(
                {'error': 'Student profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['delete'], url_path='delete-my-skill/(?P<skill_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def delete_my_skill(self, request, skill_id=None):
        """
        Delete skill from current student's alumni profile
        DELETE /api/alumni/delete-my-skill/{skill_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            if not alumni.delete_skill(skill_id):
                return Response(
                    {'error': 'Skill not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def add_my_highlight(self, request):
        """
        Add career highlight to current student's alumni profile
        POST /api/alumni/add-my-highlight/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
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
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['put'], url_path='update-my-highlight/(?P<highlight_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def update_my_highlight(self, request, highlight_id=None):
        """
        Update career highlight in current student's alumni profile
        PUT /api/alumni/update-my-highlight/{highlight_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            highlight_data = request.data
            
            if not alumni.update_highlight(highlight_id, highlight_data):
                return Response(
                    {'error': 'Highlight not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['delete'], url_path='delete-my-highlight/(?P<highlight_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def delete_my_highlight(self, request, highlight_id=None):
        """
        Delete career highlight from current student's alumni profile
        DELETE /api/alumni/delete-my-highlight/{highlight_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            if not alumni.delete_highlight(highlight_id):
                return Response(
                    {'error': 'Highlight not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def add_my_course(self, request):
        """
        Add course/certification to current student's alumni profile
        POST /api/alumni/add_my_course/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            course_data = request.data
            
            # Validate required fields
            required_fields = ['name', 'provider', 'status']
            for field in required_fields:
                if not course_data.get(field):
                    return Response(
                        {'error': f'{field} is required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            course_id = alumni.add_course(course_data)
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['put'], url_path='update-my-course/(?P<course_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def update_my_course(self, request, course_id=None):
        """
        Update course/certification in current student's alumni profile
        PUT /api/alumni/update-my-course/{course_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            course_data = request.data
            
            if not alumni.update_course(course_id, course_data):
                return Response(
                    {'error': 'Course not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['delete'], url_path='delete-my-course/(?P<course_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def delete_my_course(self, request, course_id=None):
        """
        Delete course/certification from current student's alumni profile
        DELETE /api/alumni/delete-my-course/{course_id}/
        """
        try:
            student, alumni = self._get_student_alumni(request)
            
            if not alumni.delete_course(course_id):
                return Response(
                    {'error': 'Course not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark as unverified since student edited
            alumni.mark_as_unverified(edited_by='student')
            
            # Return updated alumni
            response_serializer = AlumniSerializer(alumni)
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Alumni.DoesNotExist:
            return Response(
                {'error': 'Alumni profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify alumni profile (Admin only)
        POST /api/alumni/{id}/verify/
        
        Body: {
            "notes": "Optional verification notes"
        }
        """
        alumni = self.get_object()
        notes = request.data.get('notes', '')
        
        alumni.verify_profile(notes=notes)
        
        # Return updated alumni
        response_serializer = AlumniSerializer(alumni)
        return Response(response_serializer.data)
