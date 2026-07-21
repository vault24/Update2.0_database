"""Public website API routes — all read-only and anonymous (see views)."""
from django.urls import path

from . import views

urlpatterns = [
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
