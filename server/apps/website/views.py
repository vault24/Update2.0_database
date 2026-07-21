"""Public website API — read-only, anonymous, aggregate-safe.

Every view here explicitly opts out of the project's deny-by-default
(`IsAuthenticated`) with `AllowAny`, exactly like the public result portal
(apps.results). Reads are lightly cached and throttled; the analytics endpoint
returns ONLY aggregate counts/percentages (never names, ids, or rows).
"""
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.departments.models import Department
from apps.notices.models import Notice
from apps.students.models import Student, exclude_unapproved_alumni
from apps.teachers.models import Teacher

from . import serializers as s
from .models import (
    Achievement, Club, Download, Event, FAQ, GalleryAlbum, HeroSlide,
    LibraryResource, NewsPost, PageContent, ResearchProject, SiteSetting,
    SportsItem, Testimonial,
)

CACHE_SECONDS = 60


class PublicMixin:
    """Anonymous access + read throttle, shared by every public view."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'website_read'


@method_decorator(cache_page(CACHE_SECONDS), name='dispatch')
class PublicListView(PublicMixin, generics.ListAPIView):
    pass


@method_decorator(cache_page(CACHE_SECONDS), name='dispatch')
class PublicRetrieveView(PublicMixin, generics.RetrieveAPIView):
    pass


# ---------------------------------------------------------------------------
# Site settings
# ---------------------------------------------------------------------------
@method_decorator(cache_page(CACHE_SECONDS), name='dispatch')
class SiteSettingView(PublicMixin, APIView):
    def get(self, request):
        obj = SiteSetting.get_solo()
        return Response(s.SiteSettingSerializer(obj, context={'request': request}).data)


# ---------------------------------------------------------------------------
# CMS list/detail endpoints
# ---------------------------------------------------------------------------
class HeroListView(PublicListView):
    serializer_class = s.HeroSlideSerializer
    pagination_class = None  # small, ordered set — return all published slides

    def get_queryset(self):
        return HeroSlide.objects.filter(is_published=True)


class EventListView(PublicListView):
    serializer_class = s.EventSerializer

    def get_queryset(self):
        qs = Event.objects.filter(is_published=True)
        when = self.request.query_params.get('when')
        now = timezone.now()
        if when == 'upcoming':
            qs = qs.filter(start_at__gte=now).order_by('start_at')
        elif when == 'past':
            qs = qs.filter(start_at__lt=now)
        if self.request.query_params.get('featured') == 'true':
            qs = qs.filter(is_featured=True)
        return qs


class EventDetailView(PublicRetrieveView):
    serializer_class = s.EventSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return Event.objects.filter(is_published=True)


class NewsListView(PublicListView):
    serializer_class = s.NewsPostSerializer

    def get_queryset(self):
        return NewsPost.objects.filter(is_published=True)


class NewsDetailView(PublicRetrieveView):
    serializer_class = s.NewsPostSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return NewsPost.objects.filter(is_published=True)


class GalleryListView(PublicListView):
    serializer_class = s.GalleryAlbumSerializer

    def get_queryset(self):
        return GalleryAlbum.objects.filter(is_published=True)


class GalleryDetailView(PublicRetrieveView):
    serializer_class = s.GalleryAlbumDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return GalleryAlbum.objects.filter(is_published=True).prefetch_related('images')


class DownloadListView(PublicListView):
    serializer_class = s.DownloadSerializer

    def get_queryset(self):
        qs = Download.objects.filter(is_published=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class LibraryListView(PublicListView):
    serializer_class = s.LibraryResourceSerializer

    def get_queryset(self):
        return LibraryResource.objects.filter(is_published=True)


class ClubListView(PublicListView):
    serializer_class = s.ClubSerializer

    def get_queryset(self):
        return Club.objects.filter(is_published=True)


class SportsListView(PublicListView):
    serializer_class = s.SportsItemSerializer

    def get_queryset(self):
        return SportsItem.objects.filter(is_published=True)


class AchievementListView(PublicListView):
    serializer_class = s.AchievementSerializer

    def get_queryset(self):
        qs = Achievement.objects.filter(is_published=True).select_related('department')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class ResearchListView(PublicListView):
    serializer_class = s.ResearchProjectSerializer

    def get_queryset(self):
        return ResearchProject.objects.filter(is_published=True).select_related('department')


class TestimonialListView(PublicListView):
    serializer_class = s.TestimonialSerializer
    pagination_class = None

    def get_queryset(self):
        return Testimonial.objects.filter(is_published=True)


class FAQListView(PublicListView):
    serializer_class = s.FAQSerializer
    pagination_class = None

    def get_queryset(self):
        return FAQ.objects.filter(is_published=True)


class PageContentView(PublicRetrieveView):
    serializer_class = s.PageContentSerializer
    lookup_field = 'key'

    def get_queryset(self):
        return PageContent.objects.filter(is_published=True)


# ---------------------------------------------------------------------------
# Public views over EXISTING models
# ---------------------------------------------------------------------------
class PublicDepartmentListView(PublicListView):
    serializer_class = s.PublicDepartmentSerializer
    pagination_class = None

    def get_queryset(self):
        return Department.objects.all().prefetch_related('teachers')


class PublicDepartmentDetailView(PublicRetrieveView):
    serializer_class = s.PublicDepartmentSerializer
    lookup_field = 'code'

    def get_queryset(self):
        return Department.objects.all()


class PublicTeacherListView(PublicListView):
    serializer_class = s.PublicTeacherSerializer

    def get_queryset(self):
        # Retired teachers are hidden from the public directory by default.
        qs = Teacher.objects.exclude(employmentStatus='retired').select_related('department')
        code = self.request.query_params.get('department')
        if code:
            qs = qs.filter(department__code=code)
        return qs


class PublicTeacherDetailView(PublicRetrieveView):
    serializer_class = s.PublicTeacherDetailSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Teacher.objects.select_related('department').prefetch_related('education', 'experiences')


class PublicNoticeListView(PublicListView):
    serializer_class = s.PublicNoticeSerializer

    def get_queryset(self):
        qs = Notice.objects.filter(is_published=True).prefetch_related('attachments')
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)
        return qs


class PublicNoticeDetailView(PublicRetrieveView):
    serializer_class = s.PublicNoticeSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return Notice.objects.filter(is_published=True).prefetch_related('attachments')


# ---------------------------------------------------------------------------
# Aggregate analytics — counts/percentages only, no per-person data.
# ---------------------------------------------------------------------------
@method_decorator(cache_page(CACHE_SECONDS), name='dispatch')
class AnalyticsView(PublicMixin, APIView):
    def get(self, request):
        students = exclude_unapproved_alumni(Student.objects.all())
        current = students.filter(status='active')

        def _counts(qs, field):
            return {
                (row[field] or 'Unknown'): row['n']
                for row in qs.values(field).annotate(n=Count('id')).order_by()
            }

        gender = _counts(current, 'gender')
        by_semester = {
            str(row['semester']): row['n']
            for row in current.values('semester').annotate(n=Count('id')).order_by('semester')
        }

        by_department = [
            {
                'name': d.name,
                'code': d.code,
                'students': d.student_count(),
                'teachers': d.teacher_count(),
            }
            for d in Department.objects.all().order_by('name')
        ]

        teachers_total = Teacher.objects.exclude(employmentStatus='retired').count()

        data = {
            'students': {
                'total': students.count(),
                'current': current.count(),
                'graduated': students.filter(status='graduated').count(),
                'male': gender.get('Male', 0),
                'female': gender.get('Female', 0),
                'other': gender.get('Other', 0) + gender.get('Unknown', 0),
                'by_semester': by_semester,
            },
            'teachers': {'total': teachers_total},
            'departments': {
                'total': Department.objects.count(),
                'breakdown': by_department,
            },
            'generated_at': timezone.now().isoformat(),
        }
        return Response(data)


# ---------------------------------------------------------------------------
# Federated global search
# ---------------------------------------------------------------------------
class SearchView(PublicMixin, APIView):
    throttle_scope = 'website_search'
    LIMIT = 6

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return Response({'query': q, 'results': []})

        results = []

        for t in (Teacher.objects.exclude(employmentStatus='retired')
                  .filter(Q(fullNameEnglish__icontains=q) | Q(designation__icontains=q))
                  .select_related('department')[:self.LIMIT]):
            results.append({
                'type': 'teacher', 'id': str(t.id), 'title': t.fullNameEnglish,
                'subtitle': t.designation, 'url': f'/teachers/{t.id}',
            })

        for d in Department.objects.filter(Q(name__icontains=q) | Q(code__icontains=q))[:self.LIMIT]:
            results.append({
                'type': 'department', 'id': str(d.id), 'title': d.name,
                'subtitle': d.code, 'url': f'/departments/{d.code}',
            })

        for n in Notice.objects.filter(is_published=True, title__icontains=q)[:self.LIMIT]:
            results.append({
                'type': 'notice', 'id': str(n.id), 'title': n.title,
                'subtitle': n.get_priority_display(), 'url': f'/notices/{n.id}',
            })

        for e in Event.objects.filter(is_published=True, title_en__icontains=q)[:self.LIMIT]:
            results.append({
                'type': 'event', 'id': str(e.id), 'title': e.title_en,
                'subtitle': e.venue, 'url': f'/events/{e.slug}',
            })

        for dl in Download.objects.filter(is_published=True, title_en__icontains=q)[:self.LIMIT]:
            results.append({
                'type': 'download', 'id': str(dl.id), 'title': dl.title_en,
                'subtitle': dl.get_category_display(), 'url': '/downloads',
            })

        return Response({'query': q, 'results': results})
