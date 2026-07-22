"""Website API routes.

Public reads (anonymous) + the authenticated Website Manager CRUD under
manage/ (admin roles only — see admin_views).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_views, views

router = DefaultRouter()
router.register('hero', admin_views.HeroSlideManageViewSet, basename='manage-hero')
router.register('events', admin_views.EventManageViewSet, basename='manage-events')
router.register('news', admin_views.NewsManageViewSet, basename='manage-news')
router.register('gallery-albums', admin_views.GalleryAlbumManageViewSet, basename='manage-gallery-albums')
router.register('gallery-images', admin_views.GalleryImageManageViewSet, basename='manage-gallery-images')
router.register('downloads', admin_views.DownloadManageViewSet, basename='manage-downloads')
router.register('library', admin_views.LibraryManageViewSet, basename='manage-library')
router.register('clubs', admin_views.ClubManageViewSet, basename='manage-clubs')
router.register('sports', admin_views.SportsManageViewSet, basename='manage-sports')
router.register('achievements', admin_views.AchievementManageViewSet, basename='manage-achievements')
router.register('research', admin_views.ResearchManageViewSet, basename='manage-research')
router.register('testimonials', admin_views.TestimonialManageViewSet, basename='manage-testimonials')
router.register('faq', admin_views.FAQManageViewSet, basename='manage-faq')
router.register('pages', admin_views.PageContentManageViewSet, basename='manage-pages')

urlpatterns = [
    # ---- Website Manager (admin) ----
    path('manage/settings/', admin_views.SiteSettingManageView.as_view(), name='website-manage-settings'),
    path('manage/', include(router.urls)),

    path('settings/', views.SiteSettingView.as_view(), name='website-settings'),
    path('analytics/', views.AnalyticsView.as_view(), name='website-analytics'),
    path('search/', views.SearchView.as_view(), name='website-search'),

    # CMS content
    path('hero/', views.HeroListView.as_view(), name='website-hero'),
    path('events/', views.EventListView.as_view(), name='website-events'),
    path('events/<slug:slug>/', views.EventDetailView.as_view(), name='website-event-detail'),
    path('news/', views.NewsListView.as_view(), name='website-news'),
    path('news/<slug:slug>/', views.NewsDetailView.as_view(), name='website-news-detail'),
    path('gallery/', views.GalleryListView.as_view(), name='website-gallery'),
    path('gallery/<slug:slug>/', views.GalleryDetailView.as_view(), name='website-gallery-detail'),
    path('downloads/', views.DownloadListView.as_view(), name='website-downloads'),
    path('library/', views.LibraryListView.as_view(), name='website-library'),
    path('clubs/', views.ClubListView.as_view(), name='website-clubs'),
    path('sports/', views.SportsListView.as_view(), name='website-sports'),
    path('achievements/', views.AchievementListView.as_view(), name='website-achievements'),
    path('research/', views.ResearchListView.as_view(), name='website-research'),
    path('testimonials/', views.TestimonialListView.as_view(), name='website-testimonials'),
    path('faq/', views.FAQListView.as_view(), name='website-faq'),
    path('pages/<slug:key>/', views.PageContentView.as_view(), name='website-page'),

    # Public views over existing models
    path('departments/', views.PublicDepartmentListView.as_view(), name='website-departments'),
    path('departments/<str:code>/', views.PublicDepartmentDetailView.as_view(), name='website-department-detail'),
    path('teachers/', views.PublicTeacherListView.as_view(), name='website-teachers'),
    path('teachers/<uuid:id>/', views.PublicTeacherDetailView.as_view(), name='website-teacher-detail'),
    path('notices/', views.PublicNoticeListView.as_view(), name='website-notices'),
    path('notices/<int:pk>/', views.PublicNoticeDetailView.as_view(), name='website-notice-detail'),
]
