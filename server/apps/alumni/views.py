"""
Alumni Views
"""
import json
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from django.conf import settings
from .models import Alumni
from .serializers import (
    AlumniSerializer,
    AlumniCreateSerializer,
    AlumniUpdateSerializer,
    AlumniStatsSerializer,
    AlumniDirectorySerializer,
    AlumniPublicProfileSerializer,
    AddCareerPositionSerializer,
    UpdateSupportCategorySerializer
)
from .services import (
    ALUMNI_DOCUMENT_CATEGORIES,
    MAX_ALUMNI_DOCUMENTS,
    create_alumni_from_essentials,
    update_alumni_from_essentials,
    attach_alumni_documents,
    create_portal_account_for_alumni,
    compute_profile_completion,
    send_profile_completion_reminder,
    get_alumni_account_email,
)
from .permissions import CanManageAlumni, user_can_manage_alumni
from . import import_service
from .import_config import documentation as import_documentation

logger = logging.getLogger(__name__)


def _collect_document_items(request):
    """
    Build the document_items list expected by attach_alumni_documents from a
    multipart request.

    Expected request shape:
      - files under arbitrary field names (e.g. doc_0, doc_1, ...)
      - a 'documentMeta' field: JSON array of
            {"field": "doc_0", "category": "photo", "customName": ""}
    Falls back to treating every uploaded file as category 'other' when no
    metadata is supplied.
    """
    items = []
    meta_raw = request.data.get('documentMeta')
    if meta_raw:
        try:
            meta = json.loads(meta_raw) if isinstance(meta_raw, str) else meta_raw
        except (ValueError, TypeError):
            meta = []
        for entry in meta:
            field = entry.get('field')
            uploaded = request.FILES.get(field) if field else None
            if uploaded:
                items.append({
                    'file': uploaded,
                    'category': entry.get('category') or 'other',
                    'custom_name': entry.get('customName') or entry.get('custom_name') or '',
                })
    else:
        for field, uploaded in request.FILES.items():
            items.append({'file': uploaded, 'category': 'other', 'custom_name': ''})
    return items


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
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def directory(self, request):
        """
        Privacy-conscious alumni directory for peer discovery/networking.
        GET /api/alumni/directory/?q=&department=&graduationYear=&alumniType=

        The free-text `q` matches across name, department, current position
        (title/organization), location and skills. Only approved alumni are
        listed and only non-sensitive fields are returned. Paginated.
        """
        queryset = Alumni.objects.select_related('student', 'student__department').filter(
            reviewStatus='approved'
        )

        query = (request.query_params.get('q') or '').strip().lower()
        department = request.query_params.get('department')
        graduation_year = request.query_params.get('graduationYear')
        alumni_type = request.query_params.get('alumniType')

        # Cheap, indexed filters run in the DB.
        if department:
            queryset = queryset.filter(student__department_id=department)
        if alumni_type:
            queryset = queryset.filter(alumniType=alumni_type)
        if graduation_year:
            try:
                queryset = queryset.filter(graduationYear=int(graduation_year))
            except (ValueError, TypeError):
                pass

        queryset = queryset.order_by('-graduationYear', 'student__fullNameEnglish')

        results = list(queryset)

        # Free-text `q` spans JSON fields (position/skills) too, so match in
        # Python. The approved-alumni set is small enough for this to be fine.
        if query:
            def _matches(alumni):
                student = alumni.student
                haystack = [
                    student.fullNameEnglish or '',
                    student.department.name if student.department_id else '',
                ]
                cp = alumni.currentPosition or {}
                haystack += [cp.get('positionTitle') or '', cp.get('organizationName') or '']
                for c in (alumni.careerHistory or []):
                    haystack += [
                        c.get('positionTitle') or '', c.get('organizationName') or '',
                        c.get('institution') or '', c.get('businessName') or '', c.get('location') or '',
                    ]
                addr = student.presentAddress if isinstance(student.presentAddress, dict) else {}
                haystack.append(addr.get('district') or '')
                haystack += [s.get('name') or '' for s in (alumni.skills or [])]
                return query in ' '.join(haystack).lower()

            results = [a for a in results if _matches(a)]

        page = self.paginate_queryset(results)
        if page is not None:
            serializer = AlumniDirectorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AlumniDirectorySerializer(results, many=True)
        return Response({'count': len(results), 'results': serializer.data})

    @action(detail=True, methods=['get'], url_path='public-profile',
            permission_classes=[IsAuthenticated])
    def public_profile(self, request, pk=None):
        """
        Detailed public profile for the directory click-through modal.
        GET /api/alumni/{studentId}/public-profile/

        Approved alumni only; returns networking-appropriate detail incl. bio,
        careers, skills, highlights and contact info.
        """
        alumni = self.get_object()
        if alumni.reviewStatus != 'approved':
            return Response({'error': 'This profile is not publicly available.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(AlumniPublicProfileSerializer(alumni).data)

    # ------------------------------------------------------------------
    # Profile / cover photo uploads (student self-service)
    # ------------------------------------------------------------------

    def _alumni_storage_data(self, alumni):
        student = alumni.student
        department = student.department
        return {
            'department_code': (getattr(department, 'code', '') or 'unknown').lower().replace(' ', '-'),
            'department_name': (getattr(department, 'name', '') or '').lower().replace(' ', '-'),
            'graduation_year': str(alumni.graduationYear or 'unknown'),
            'alumni_name': (student.fullNameEnglish or 'alumni').replace(' ', ''),
            'alumni_id': student.currentRollNumber or str(student.id)[:8],
        }

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser],
            permission_classes=[IsAuthenticated])
    def upload_my_avatar(self, request):
        """
        Upload/replace the authenticated alumnus's profile photo.
        POST /api/alumni/upload_my_avatar/  (multipart: file)
        Updates the underlying student's profilePhoto (the single source of
        truth used everywhere the avatar appears).
        """
        try:
            student, alumni = self._get_student_alumni(request)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)

        uploaded = request.FILES.get('file') or request.FILES.get('photo')
        if not uploaded:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

        from utils.structured_file_storage import structured_storage
        try:
            file_info = structured_storage.save_alumni_document(
                uploaded_file=uploaded,
                alumni_data=self._alumni_storage_data(alumni),
                document_category='photo',
                validate=True,
            )
        except Exception as exc:  # noqa: BLE001
            return Response({'error': f'Upload failed: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        student.profilePhoto = structured_storage.get_file_url(file_info['file_path'])
        student.save(update_fields=['profilePhoto'])
        return Response({
            'profilePhoto': student.profilePhoto,
            'avatar': request.build_absolute_uri(student.profilePhoto),
        })

    # ------------------------------------------------------------------
    # Admin: profile-completion reporting + reminder emails
    # ------------------------------------------------------------------

    def _completion_queryset(self, params):
        """Shared filtered queryset for the completion tools (approved alumni)."""
        qs = Alumni.objects.select_related('student', 'student__department').filter(
            reviewStatus='approved'
        )
        department = params.get('department')
        registration_source = params.get('registrationSource')
        if department:
            qs = qs.filter(student__department_id=department)
        if registration_source:
            qs = qs.filter(registrationSource=registration_source)
        return qs

    @action(detail=False, methods=['get'], url_path='completion-report',
            permission_classes=[CanManageAlumni])
    def completion_report(self, request):
        """
        Admin: report each alumnus's profile-completion % so the admin can
        decide who should receive reminder emails.
        GET /api/alumni/completion-report/?threshold=50&department=&registrationSource=
        """
        try:
            threshold = int(request.query_params.get('threshold') or 100)
        except (ValueError, TypeError):
            threshold = 100
        threshold = max(0, min(100, threshold))

        rows = []
        below_with_email = 0
        for alumni in self._completion_queryset(request.query_params):
            comp = compute_profile_completion(alumni)
            email = get_alumni_account_email(alumni)
            is_below = comp['percentage'] < threshold
            if is_below and email:
                below_with_email += 1
            rows.append({
                'id': str(alumni.student_id),
                'name': alumni.student.fullNameEnglish or '',
                'department': alumni.student.department.name if alumni.student.department_id else '',
                'graduationYear': alumni.graduationYear,
                'email': email,
                'hasEmail': bool(email),
                'percentage': comp['percentage'],
                'missing': comp['missing'],
                'belowThreshold': is_below,
            })

        rows.sort(key=lambda r: r['percentage'])
        return Response({
            'threshold': threshold,
            'total': len(rows),
            'belowThreshold': sum(1 for r in rows if r['belowThreshold']),
            'eligibleForEmail': below_with_email,
            'results': rows,
        })

    @action(detail=False, methods=['post'], url_path='send-completion-reminders',
            permission_classes=[CanManageAlumni])
    def send_completion_reminders(self, request):
        """
        Admin: email alumni whose profile completion is below `threshold`.
        POST /api/alumni/send-completion-reminders/
        Body: {
          "threshold": 50,               # required target %
          "department": "<id>",          # optional filter
          "registrationSource": "...",   # optional filter
          "studentIds": ["..."],         # optional explicit recipient list
          "dryRun": true                 # preview without sending
        }
        """
        try:
            threshold = int(request.data.get('threshold') if request.data.get('threshold') is not None else 50)
        except (ValueError, TypeError):
            return Response({'error': 'threshold must be a number.'}, status=status.HTTP_400_BAD_REQUEST)
        threshold = max(0, min(100, threshold))

        dry_run = bool(request.data.get('dryRun'))
        student_ids = request.data.get('studentIds') or None

        qs = self._completion_queryset(request.data)
        if student_ids:
            qs = qs.filter(student_id__in=student_ids)

        matched = 0
        sent = 0
        skipped_no_email = 0
        failed = 0
        recipients = []

        for alumni in qs:
            comp = compute_profile_completion(alumni)
            if comp['percentage'] >= threshold:
                continue
            email = get_alumni_account_email(alumni)
            if not email:
                skipped_no_email += 1
                continue
            matched += 1
            entry = {
                'id': str(alumni.student_id),
                'name': alumni.student.fullNameEnglish or '',
                'email': email,
                'percentage': comp['percentage'],
            }
            if not dry_run:
                try:
                    send_profile_completion_reminder(alumni, comp)
                    sent += 1
                    entry['status'] = 'sent'
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Failed to send completion reminder to %s", email)
                    failed += 1
                    entry['status'] = 'failed'
                    entry['error'] = str(exc) if settings.DEBUG else None
            recipients.append(entry)

        return Response({
            'dryRun': dry_run,
            'threshold': threshold,
            'matched': matched,
            'sent': sent,
            'skippedNoEmail': skipped_no_email,
            'failed': failed,
            'recipients': recipients,
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
                    'details': str(e) if settings.DEBUG else None
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
                    'details': str(e) if settings.DEBUG else None
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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
                {'error': str(e) if settings.DEBUG else None},
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

    # ------------------------------------------------------------------
    # Manual alumni creation, self-registration, documents, portal account
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'])
    def document_categories(self, request):
        """
        List the predefined alumni document categories (plus the 'custom' option)
        so the frontend uploader can render the category dropdown.
        GET /api/alumni/document-categories/
        """
        categories = [
            {'key': key, 'display': cfg['display'], 'isCustom': key == 'custom'}
            for key, cfg in ALUMNI_DOCUMENT_CATEGORIES.items()
        ]
        return Response({'categories': categories, 'maxDocuments': MAX_ALUMNI_DOCUMENTS})

    # ------------------------------------------------------------------
    # Spreadsheet import (Excel / CSV / Google Sheets)
    # ------------------------------------------------------------------
    def _read_import_source(self, request):
        """Pull (headers, rows) from an uploaded file or a Google Sheets link."""
        return import_service.read_table(
            file=request.FILES.get('file'),
            sheet_url=(request.data.get('sheetUrl') or '').strip() or None,
        )

    @action(detail=False, methods=['get'], url_path='import-schema')
    def import_schema(self, request):
        """
        The field catalogue driving the admin "Column Reference" docs and the
        "Copy Column Template" button.
        GET /api/alumni/import-schema/

        Generated from apps/alumni/import_config.py, so the documentation can
        never drift from what the importer actually accepts.
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(import_documentation())

    @action(detail=False, methods=['post'], url_path='import-preview',
            parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_preview(self, request):
        """
        Dry run: report detected columns, row counts and per-row problems
        WITHOUT writing anything.
        POST /api/alumni/import-preview/   (multipart: file | sheetUrl)
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            headers, rows = self._read_import_source(request)
            return Response(import_service.preview_import(headers, rows))
        except import_service.ImportError_ as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.exception('Alumni import preview failed')
            return Response(
                {'error': 'Could not read that file.',
                 'details': str(exc) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'], url_path='import',
            parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_alumni(self, request):
        """
        Import alumni from a spreadsheet. Valid rows are created inside one
        transaction; invalid rows are reported and skipped.
        POST /api/alumni/import/   (multipart: file | sheetUrl)
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            headers, rows = self._read_import_source(request)
            summary = import_service.import_alumni(headers, rows, dry_run=False)
        except import_service.ImportError_ as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.exception('Alumni import failed')
            return Response(
                {'error': 'Import failed — no records were saved.',
                 'details': str(exc) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        logger.info(
            'Alumni import by %s: imported=%s skipped=%s failed=%s',
            request.user.username, summary['imported'], summary['skipped'], summary['failed'],
        )
        return Response(summary, status=status.HTTP_201_CREATED if summary['imported'] else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def manual_create(self, request):
        """
        Admin: create an alumni from essential info only.
        POST /api/alumni/manual-create/   (multipart/form-data)

        Form fields:
          - payload: JSON string with student + alumni fields and optional
                     semesterResults (every field optional except fullNameEnglish
                     and department).
          - documentMeta: JSON array describing uploaded files (see
                          _collect_document_items).
          - <file fields>: the actual document files.

        Workflow: Student is created in the background, immediately transitioned
        to Alumni, then documents are attached.
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        payload_raw = request.data.get('payload')
        if payload_raw:
            try:
                data = json.loads(payload_raw) if isinstance(payload_raw, str) else payload_raw
            except (ValueError, TypeError):
                return Response({'error': 'Invalid payload JSON.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Allow flat form fields / pure JSON body as a fallback.
            data = {k: v for k, v in request.data.items() if k not in ('documentMeta',)}

        try:
            alumni = create_alumni_from_essentials(
                data=data,
                registration_source='admin_manual',
                review_status='approved',
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Manual alumni creation failed")
            return Response(
                {'error': 'Failed to create alumni.', 'details': str(exc) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        document_result = attach_alumni_documents(alumni, _collect_document_items(request))

        response_serializer = AlumniSerializer(alumni)
        return Response(
            {
                'alumni': response_serializer.data,
                'documents': document_result,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser],
            permission_classes=[IsAuthenticated])
    def self_register(self, request):
        """
        Student-side: an alumnus registers themselves with essential info.
        POST /api/alumni/self-register/   (multipart/form-data)

        Same shape as manual_create. The record is linked to the authenticated
        user and starts as reviewStatus='pending' so an admin can verify it.
        """
        user = request.user

        # Prevent duplicate alumni for an account that already has one.
        if user.related_profile_id and Alumni.objects.filter(student_id=user.related_profile_id).exists():
            return Response(
                {'error': 'An alumni profile already exists for your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload_raw = request.data.get('payload')
        if payload_raw:
            try:
                data = json.loads(payload_raw) if isinstance(payload_raw, str) else payload_raw
            except (ValueError, TypeError):
                return Response({'error': 'Invalid payload JSON.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            data = {k: v for k, v in request.data.items() if k not in ('documentMeta',)}

        # Default contact details from the account when omitted.
        if not data.get('email'):
            data['email'] = user.email
        if not data.get('fullNameEnglish') and (user.first_name or user.last_name):
            data['fullNameEnglish'] = f"{user.first_name} {user.last_name}".strip()

        try:
            alumni = create_alumni_from_essentials(
                data=data,
                registration_source='self_registration',
                review_status='pending',
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Alumni self-registration failed")
            return Response(
                {'error': 'Failed to submit alumni registration.', 'details': str(exc) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Link the new student profile to the account.
        user.related_profile_id = alumni.student.id
        user.admission_status = 'approved'
        user.save(update_fields=['related_profile_id', 'admission_status'])

        document_result = attach_alumni_documents(alumni, _collect_document_items(request))

        return Response(
            {
                'alumni': AlumniSerializer(alumni).data,
                'documents': document_result,
                'message': 'Your alumni information has been submitted and is pending verification.',
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser],
            permission_classes=[IsAuthenticated])
    def resubmit_my_application(self, request):
        """
        Student-side: a self-registered alumnus whose application was rejected
        (or is still pending) edits and re-submits it — the alumni counterpart
        of the admission reapply flow.
        POST /api/alumni/resubmit_my_application/   (multipart/form-data)

        Updates the existing Student + Alumni records in place, attaches any
        newly uploaded documents, and resets reviewStatus to 'pending'.
        """
        user = request.user
        student_id = user.related_profile_id
        alumni = None
        if student_id:
            alumni = Alumni.objects.filter(student_id=student_id).first()
        if alumni is None:
            return Response(
                {'error': 'No alumni application found for your account.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if alumni.reviewStatus == 'approved':
            return Response(
                {'error': 'Your alumni application is already approved and cannot be resubmitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload_raw = request.data.get('payload')
        if payload_raw:
            try:
                data = json.loads(payload_raw) if isinstance(payload_raw, str) else payload_raw
            except (ValueError, TypeError):
                return Response({'error': 'Invalid payload JSON.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            data = {k: v for k, v in request.data.items() if k not in ('documentMeta',)}

        if not data.get('email'):
            data['email'] = user.email

        try:
            alumni = update_alumni_from_essentials(alumni=alumni, data=data)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Alumni re-submission failed")
            return Response(
                {'error': 'Failed to resubmit alumni application.', 'details': str(exc) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        document_result = attach_alumni_documents(alumni, _collect_document_items(request))

        return Response(
            {
                'alumni': AlumniSerializer(alumni).data,
                'documents': document_result,
                'message': 'Your alumni application has been updated and resubmitted for review.',
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser, JSONParser],
            url_path='documents')
    def documents(self, request, pk=None):
        """
        GET  /api/alumni/{id}/documents/   -> list alumni documents
        POST /api/alumni/{id}/documents/   -> upload more documents (multipart)
        """
        alumni = self.get_object()

        if request.method.lower() == 'get':
            from apps.documents.models import Document
            docs = Document.objects.filter(
                student=alumni.student, document_type='alumni', status='active'
            ).order_by('-uploadDate')
            return Response({'documents': [
                {
                    'id': str(doc.id),
                    'fileName': doc.fileName,
                    'fileType': doc.fileType,
                    'category': doc.category,
                    'displayName': (doc.metadata or {}).get('display_name', doc.description),
                    'alumniCategory': (doc.metadata or {}).get('alumni_category', doc.original_field_name),
                    'fileUrl': doc.file_url,
                    'fileSize': doc.fileSize,
                    'uploadDate': doc.uploadDate,
                }
                for doc in docs
            ]})

        # POST upload
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        result = attach_alumni_documents(alumni, _collect_document_items(request))
        http_status = status.HTTP_201_CREATED if result['created'] else status.HTTP_400_BAD_REQUEST
        return Response(result, status=http_status)

    @action(detail=True, methods=['delete'], url_path='documents/(?P<document_id>[^/.]+)')
    def delete_document(self, request, pk=None, document_id=None):
        """
        DELETE /api/alumni/{id}/documents/{document_id}/
        Removes the file from storage and the Document record.
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        alumni = self.get_object()
        from apps.documents.models import Document
        from utils.structured_file_storage import structured_storage

        try:
            document = Document.objects.get(
                id=document_id, student=alumni.student, document_type='alumni'
            )
        except Document.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        structured_storage.delete_file(document.filePath)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='create-portal-account')
    def create_portal_account(self, request, pk=None):
        """
        Admin: create a student-portal login for a manually-added alumnus.
        POST /api/alumni/{id}/create-portal-account/

        Body (optional): { "email": "...", "password": "..." }
        Returns generated credentials when a password was auto-created.
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        alumni = self.get_object()
        try:
            result = create_portal_account_for_alumni(
                alumni,
                email=request.data.get('email'),
                password=request.data.get('password'),
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Portal account creation failed")
            return Response(
                {'error': 'Failed to create portal account.', 'details': str(exc) if settings.DEBUG else None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                'message': 'Portal account created successfully.',
                'username': result['username'],
                'email': result['email'],
                'generatedPassword': result['password'],
                'hasAccount': True,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='portal-account-status')
    def portal_account_status(self, request, pk=None):
        """
        Whether a portal account is already linked to this alumni.
        GET /api/alumni/{id}/portal-account-status/
        """
        alumni = self.get_object()
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(related_profile_id=alumni.student.id).first()
        return Response({
            'hasAccount': user is not None,
            'username': user.username if user else None,
            'email': user.email if user else None,
        })

    @action(detail=False, methods=['get'], url_path='pending-review')
    def pending_review(self, request):
        """
        Admin: list self-registered alumni awaiting verification.
        GET /api/alumni/pending-review/
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = Alumni.objects.select_related('student', 'student__department').filter(
            reviewStatus='pending'
        ).order_by('-createdAt')
        serializer = AlumniSerializer(queryset, many=True)
        return Response({'count': queryset.count(), 'results': serializer.data})

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        """
        Admin: approve or reject a self-registered alumni.
        POST /api/alumni/{id}/review/
        Body: { "action": "approve" | "reject", "notes": "..." }
        """
        if not user_can_manage_alumni(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        alumni = self.get_object()
        decision = (request.data.get('action') or '').lower()
        notes = request.data.get('notes', '')

        if decision == 'approve':
            alumni.reviewStatus = 'approved'
            alumni.verify_profile(notes=notes)
        elif decision == 'reject':
            alumni.reviewStatus = 'rejected'
            alumni.isVerified = False
            alumni.verificationNotes = notes
            alumni.save(update_fields=['reviewStatus', 'isVerified', 'verificationNotes'])
        else:
            return Response({'error': "action must be 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

        # Tell the alumnus about the decision (in-app; best-effort).
        try:
            from django.contrib.auth import get_user_model
            from apps.notifications.models import Notification
            User = get_user_model()
            account = User.objects.filter(related_profile_id=alumni.student_id).first()
            if account:
                if decision == 'approve':
                    title = 'Alumni Application Approved'
                    message = 'Congratulations! Your alumni application has been approved. The full alumni portal is now available.'
                else:
                    title = 'Alumni Application Rejected'
                    message = 'Your alumni application was not approved.'
                    if notes:
                        message += f' Reason: {notes}'
                Notification.objects.create(
                    recipient=account,
                    notification_type='account_activity',
                    title=title,
                    message=message,
                    data={'alumni_student_id': str(alumni.student_id), 'decision': decision},
                    status='unread',
                )
        except Exception:
            logger.exception("Failed to notify alumnus about review decision")

        return Response(AlumniSerializer(alumni).data)
