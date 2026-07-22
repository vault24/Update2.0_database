"""Write-enabled serializers for the in-app Website Manager (admin only).

Plain ModelSerializers: DRF renders file/image fields as absolute URLs when a
request is in context, and accepts multipart uploads for writes. The public
read serializers in serializers.py stay untouched.
"""
from rest_framework import serializers

from .models import (
    Achievement, Club, Download, Event, FAQ, GalleryAlbum, GalleryImage,
    HeroSlide, LibraryResource, NewsPost, PageContent, ResearchProject,
    SiteSetting, SportsItem, Testimonial,
)


class ManageSiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        exclude = ['updated_by']
        read_only_fields = ['id', 'created_at', 'updated_at']


class _ManageBase(serializers.ModelSerializer):
    class Meta:
        exclude = ['created_at', 'updated_at']
        read_only_fields = ['id']


class ManageHeroSlideSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = HeroSlide


class ManageEventSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = Event
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}

    def validate(self, attrs):
        # Auto-slug from the English title so editors never have to type one.
        if not attrs.get('slug') and attrs.get('title_en'):
            from django.utils.text import slugify
            base = slugify(attrs['title_en'])[:260] or 'event'
            slug, n = base, 2
            qs = Event.objects.exclude(pk=self.instance.pk if self.instance else None)
            while qs.filter(slug=slug).exists():
                slug = f"{base}-{n}"
                n += 1
            attrs['slug'] = slug
        return attrs


class ManageNewsPostSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = NewsPost
        exclude = ['created_at', 'updated_at', 'author']
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}

    def validate(self, attrs):
        if not attrs.get('slug') and attrs.get('title_en'):
            from django.utils.text import slugify
            base = slugify(attrs['title_en'])[:260] or 'news'
            slug, n = base, 2
            qs = NewsPost.objects.exclude(pk=self.instance.pk if self.instance else None)
            while qs.filter(slug=slug).exists():
                slug = f"{base}-{n}"
                n += 1
            attrs['slug'] = slug
        return attrs


class ManageGalleryAlbumSerializer(_ManageBase):
    image_count = serializers.IntegerField(source='images.count', read_only=True)

    class Meta(_ManageBase.Meta):
        model = GalleryAlbum
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}

    def validate(self, attrs):
        if not attrs.get('slug') and attrs.get('title_en'):
            from django.utils.text import slugify
            base = slugify(attrs['title_en'])[:260] or 'album'
            slug, n = base, 2
            qs = GalleryAlbum.objects.exclude(pk=self.instance.pk if self.instance else None)
            while qs.filter(slug=slug).exists():
                slug = f"{base}-{n}"
                n += 1
            attrs['slug'] = slug
        return attrs


class ManageGalleryImageSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = GalleryImage


class ManageDownloadSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = Download
        read_only_fields = ['id', 'download_count']


class ManageLibraryResourceSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = LibraryResource


class ManageClubSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = Club


class ManageSportsItemSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = SportsItem


class ManageAchievementSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = Achievement
        exclude = ['created_at', 'updated_at', 'created_by']


class ManageResearchProjectSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = ResearchProject
        exclude = ['created_at', 'updated_at', 'created_by']


class ManageTestimonialSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = Testimonial


class ManageFAQSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = FAQ


class ManagePageContentSerializer(_ManageBase):
    class Meta(_ManageBase.Meta):
        model = PageContent
