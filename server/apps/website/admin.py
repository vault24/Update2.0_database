"""Django admin registration for public-website CMS content.

This gives Principal/Super-Admin staff a working content editor immediately
(the richer in-app "Website Manager" comes in a later phase). Every model is
publishable + orderable, so listing shows those controls inline.
"""
from django.contrib import admin

from .models import (
    Achievement, Club, Download, Event, FAQ, GalleryAlbum, GalleryImage,
    HeroSlide, LibraryResource, NewsPost, PageContent, ResearchProject,
    SiteSetting, SportsItem, Testimonial,
)


class PublishableAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'is_published', 'order', 'updated_at')
    list_editable = ('is_published', 'order')
    list_filter = ('is_published',)


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        # Singleton — never allow a second row.
        return not SiteSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HeroSlide)
class HeroSlideAdmin(PublishableAdmin):
    list_display = ('headline_en', 'is_published', 'order', 'updated_at')


@admin.register(Event)
class EventAdmin(PublishableAdmin):
    list_display = ('title_en', 'category', 'start_at', 'is_featured', 'is_published', 'order')
    list_editable = ('is_featured', 'is_published', 'order')
    list_filter = ('is_published', 'is_featured', 'category')
    search_fields = ('title_en', 'title_bn', 'venue')
    prepopulated_fields = {'slug': ('title_en',)}


@admin.register(NewsPost)
class NewsPostAdmin(PublishableAdmin):
    list_display = ('title_en', 'published_at', 'is_published', 'order')
    search_fields = ('title_en', 'title_bn')
    prepopulated_fields = {'slug': ('title_en',)}


class GalleryImageInline(admin.TabularInline):
    model = GalleryImage
    extra = 3


@admin.register(GalleryAlbum)
class GalleryAlbumAdmin(PublishableAdmin):
    list_display = ('title_en', 'is_published', 'order', 'updated_at')
    prepopulated_fields = {'slug': ('title_en',)}
    inlines = [GalleryImageInline]


@admin.register(Download)
class DownloadAdmin(PublishableAdmin):
    list_display = ('title_en', 'category', 'download_count', 'is_published', 'order')
    list_filter = ('is_published', 'category')


@admin.register(Achievement)
class AchievementAdmin(PublishableAdmin):
    list_display = ('title_en', 'category', 'department', 'achieved_on', 'is_published', 'order')
    list_filter = ('is_published', 'category', 'department')
    search_fields = ('title_en', 'title_bn')


@admin.register(ResearchProject)
class ResearchProjectAdmin(PublishableAdmin):
    list_display = ('title_en', 'status', 'year', 'department', 'is_published', 'order')
    list_filter = ('is_published', 'status', 'department')
    search_fields = ('title_en', 'authors')


@admin.register(PageContent)
class PageContentAdmin(admin.ModelAdmin):
    list_display = ('key', 'title_en', 'is_published', 'updated_at')
    prepopulated_fields = {'key': ('title_en',)}


admin.site.register(LibraryResource, PublishableAdmin)
admin.site.register(Club, PublishableAdmin)
admin.site.register(SportsItem, PublishableAdmin)
admin.site.register(Testimonial, PublishableAdmin)
admin.site.register(FAQ, PublishableAdmin)
