"""Website Manager API — authenticated CRUD for the public-site CMS content.

Access is restricted to Principal / Department Head / superuser via
IsWebsiteManager below. Registrars, teachers and students never reach these
endpoints. All content changes appear on the public site immediately (the
public reads are cached for only 60s).
"""
from rest_framework import permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView


class IsWebsiteManager(permissions.BasePermission):
    """Website Manager access: Principal (institute_head), Department Head, or
    a Django superuser/staff account. Registrars, teachers and students are
    excluded — matching the sidebar visibility in the admin SPA."""

    message = 'You do not have permission to manage the public website.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.is_staff or user.role in ('institute_head', 'department_head'))
        )

from . import admin_serializers as s
from .models import (
    Achievement, Club, Download, Event, FAQ, GalleryAlbum, GalleryImage,
    HeroSlide, LibraryResource, NewsPost, PageContent, ResearchProject,
    SiteSetting, SportsItem, Testimonial,
)


class SiteSettingManageView(APIView):
    """Singleton settings: GET returns it, PUT/PATCH partially updates it."""

    permission_classes = [IsWebsiteManager]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        obj = SiteSetting.get_solo()
        return Response(s.ManageSiteSettingSerializer(obj, context={'request': request}).data)

    def put(self, request):
        obj = SiteSetting.get_solo()
        ser = s.ManageSiteSettingSerializer(obj, data=request.data, partial=True, context={'request': request})
        ser.is_valid(raise_exception=True)
        ser.save(updated_by=request.user)
        return Response(ser.data)

    patch = put


class _ManageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsWebsiteManager]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None  # manager tables show the full (small) set


class HeroSlideManageViewSet(_ManageViewSet):
    queryset = HeroSlide.objects.all()
    serializer_class = s.ManageHeroSlideSerializer


class EventManageViewSet(_ManageViewSet):
    queryset = Event.objects.all()
    serializer_class = s.ManageEventSerializer


class NewsManageViewSet(_ManageViewSet):
    queryset = NewsPost.objects.all()
    serializer_class = s.ManageNewsPostSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class GalleryAlbumManageViewSet(_ManageViewSet):
    queryset = GalleryAlbum.objects.all()
    serializer_class = s.ManageGalleryAlbumSerializer


class GalleryImageManageViewSet(_ManageViewSet):
    queryset = GalleryImage.objects.select_related('album')
    serializer_class = s.ManageGalleryImageSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        album = self.request.query_params.get('album')
        if album:
            qs = qs.filter(album_id=album)
        return qs


class DownloadManageViewSet(_ManageViewSet):
    queryset = Download.objects.all()
    serializer_class = s.ManageDownloadSerializer


class LibraryManageViewSet(_ManageViewSet):
    queryset = LibraryResource.objects.all()
    serializer_class = s.ManageLibraryResourceSerializer


class ClubManageViewSet(_ManageViewSet):
    queryset = Club.objects.all()
    serializer_class = s.ManageClubSerializer


class SportsManageViewSet(_ManageViewSet):
    queryset = SportsItem.objects.all()
    serializer_class = s.ManageSportsItemSerializer


class AchievementManageViewSet(_ManageViewSet):
    queryset = Achievement.objects.select_related('department')
    serializer_class = s.ManageAchievementSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ResearchManageViewSet(_ManageViewSet):
    queryset = ResearchProject.objects.select_related('department')
    serializer_class = s.ManageResearchProjectSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TestimonialManageViewSet(_ManageViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = s.ManageTestimonialSerializer


class FAQManageViewSet(_ManageViewSet):
    queryset = FAQ.objects.all()
    serializer_class = s.ManageFAQSerializer


class PageContentManageViewSet(_ManageViewSet):
    queryset = PageContent.objects.all()
    serializer_class = s.ManagePageContentSerializer
