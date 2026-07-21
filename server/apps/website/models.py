"""
Public Website (CMS) models.

These models hold ONLY content that does not already exist elsewhere in the
system (hero banners, events, news, gallery, downloads, library, clubs, sports,
achievements, research). Everything else the public site shows — teachers,
departments, notices, results, student statistics — is surfaced through
read-only public serializers over the EXISTING models. Nothing here duplicates
another app's data.

Bilingual convention: paired ``*_en`` / ``*_bn`` fields, English required and
Bangla optional (nullable/blank), matching the rest of the codebase
(``fullNameEnglish`` / ``fullNameBangla`` on Teacher, bilingual notice sections).
The API returns both; the frontend picks the field for the active locale.
"""
import uuid

from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """Common created/updated timestamps for every CMS record."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PublishableModel(TimeStampedModel):
    """CMS content that admins/teachers can publish or hide, with manual ordering.

    ``is_published=False`` keeps a draft out of every public endpoint. ``order``
    gives editors deterministic control of position (lower = earlier); ties fall
    back to most-recent-first.
    """

    is_published = models.BooleanField(default=True, db_index=True)
    order = models.PositiveIntegerField(default=0, help_text="Lower shows first.")

    class Meta:
        abstract = True
        ordering = ['order', '-created_at']


# ---------------------------------------------------------------------------
# Site-wide settings (singleton) — the public face beyond system_settings.
# ---------------------------------------------------------------------------
class SiteSetting(TimeStampedModel):
    """Singleton holding public-website content that ``system_settings`` doesn't.

    Institute name/address/phone/email/logo already live in
    ``apps.system_settings.SystemSettings`` and are NOT re-stored here — the
    public ``/settings/`` endpoint merges both. This model only adds the
    marketing/identity fields a public site needs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # About / identity
    about_short_en = models.TextField(blank=True, help_text="One-paragraph intro for the home page.")
    about_short_bn = models.TextField(blank=True)
    about_full_en = models.TextField(blank=True)
    about_full_bn = models.TextField(blank=True)
    history_en = models.TextField(blank=True)
    history_bn = models.TextField(blank=True)
    mission_en = models.TextField(blank=True)
    mission_bn = models.TextField(blank=True)
    vision_en = models.TextField(blank=True)
    vision_bn = models.TextField(blank=True)
    established_year = models.CharField(max_length=4, blank=True)

    # Principal's message
    principal_name_en = models.CharField(max_length=255, blank=True)
    principal_name_bn = models.CharField(max_length=255, blank=True)
    principal_designation_en = models.CharField(max_length=255, blank=True, default="Principal")
    principal_designation_bn = models.CharField(max_length=255, blank=True)
    principal_message_en = models.TextField(blank=True)
    principal_message_bn = models.TextField(blank=True)
    principal_photo = models.ImageField(upload_to='website/principal/', null=True, blank=True)

    # Contact / map / socials
    contact_address_en = models.TextField(blank=True)
    contact_address_bn = models.TextField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.EmailField(blank=True)
    map_embed_url = models.URLField(blank=True, help_text="Google Maps embed URL.")
    facebook_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)

    # Site-wide banners / toggles
    emergency_notice_enabled = models.BooleanField(default=False)
    emergency_notice_en = models.CharField(max_length=500, blank=True)
    emergency_notice_bn = models.CharField(max_length=500, blank=True)
    announcement_enabled = models.BooleanField(default=False)
    announcement_en = models.CharField(max_length=500, blank=True)
    announcement_bn = models.CharField(max_length=500, blank=True)
    announcement_link = models.URLField(blank=True)

    # External portal links surfaced on the public site.
    student_portal_url = models.URLField(blank=True, default="https://spisg.gov.bd")
    admin_portal_url = models.URLField(blank=True, default="https://su.spisg.gov.bd")
    result_portal_url = models.URLField(blank=True, default="https://result.spisg.gov.bd")

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='updated_site_settings',
    )

    class Meta:
        db_table = 'website_site_settings'
        verbose_name = 'Site Setting'
        verbose_name_plural = 'Site Settings'

    def __str__(self):
        return "Public Website Settings"

    @classmethod
    def get_solo(cls):
        """Return the single settings row, creating it on first access."""
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create()
        return obj


# ---------------------------------------------------------------------------
# Hero banner
# ---------------------------------------------------------------------------
class HeroSlide(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image = models.ImageField(upload_to='website/hero/')
    headline_en = models.CharField(max_length=255)
    headline_bn = models.CharField(max_length=255, blank=True)
    subtitle_en = models.CharField(max_length=500, blank=True)
    subtitle_bn = models.CharField(max_length=500, blank=True)
    cta_label_en = models.CharField(max_length=80, blank=True)
    cta_label_bn = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=500, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_hero_slides'
        verbose_name = 'Hero Slide'
        verbose_name_plural = 'Hero Slides'

    def __str__(self):
        return self.headline_en


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------
class Event(PublishableModel):
    CATEGORY_CHOICES = [
        ('academic', 'Academic'),
        ('cultural', 'Cultural'),
        ('sports', 'Sports'),
        ('seminar', 'Seminar'),
        ('workshop', 'Workshop'),
        ('notice', 'Notice'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description_en = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    cover_image = models.ImageField(upload_to='website/events/', null=True, blank=True)
    venue = models.CharField(max_length=255, blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)

    class Meta(PublishableModel.Meta):
        db_table = 'website_events'
        ordering = ['-start_at']
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        indexes = [models.Index(fields=['is_published', '-start_at'])]

    def __str__(self):
        return self.title_en


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------
class NewsPost(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    excerpt_en = models.CharField(max_length=500, blank=True)
    excerpt_bn = models.CharField(max_length=500, blank=True)
    body_en = models.TextField(blank=True)
    body_bn = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='website/news/', null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='website_news',
    )

    class Meta(PublishableModel.Meta):
        db_table = 'website_news'
        ordering = ['-published_at', '-created_at']
        verbose_name = 'News Post'
        verbose_name_plural = 'News Posts'

    def __str__(self):
        return self.title_en


# ---------------------------------------------------------------------------
# Gallery
# ---------------------------------------------------------------------------
class GalleryAlbum(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description_en = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='website/gallery/', null=True, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_gallery_albums'
        verbose_name = 'Gallery Album'
        verbose_name_plural = 'Gallery Albums'

    def __str__(self):
        return self.title_en


class GalleryImage(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    album = models.ForeignKey(GalleryAlbum, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='website/gallery/')
    caption_en = models.CharField(max_length=255, blank=True)
    caption_bn = models.CharField(max_length=255, blank=True)
    video_url = models.URLField(blank=True, help_text="Optional YouTube/Vimeo URL for video items.")

    class Meta(PublishableModel.Meta):
        db_table = 'website_gallery_images'
        verbose_name = 'Gallery Image'
        verbose_name_plural = 'Gallery Images'

    def __str__(self):
        return self.caption_en or f"Image {self.pk}"


# ---------------------------------------------------------------------------
# Downloads
# ---------------------------------------------------------------------------
class Download(PublishableModel):
    CATEGORY_CHOICES = [
        ('form', 'Form'),
        ('prospectus', 'Prospectus'),
        ('calendar', 'Academic Calendar'),
        ('syllabus', 'Syllabus'),
        ('routine', 'Routine'),
        ('policy', 'Policy'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    description_en = models.CharField(max_length=500, blank=True)
    description_bn = models.CharField(max_length=500, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    file = models.FileField(upload_to='website/downloads/')
    download_count = models.PositiveIntegerField(default=0)

    class Meta(PublishableModel.Meta):
        db_table = 'website_downloads'
        verbose_name = 'Download'
        verbose_name_plural = 'Downloads'

    def __str__(self):
        return self.title_en


# ---------------------------------------------------------------------------
# Library
# ---------------------------------------------------------------------------
class LibraryResource(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    description_en = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    resource_url = models.URLField(blank=True)
    file = models.FileField(upload_to='website/library/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='website/library/', null=True, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_library_resources'
        verbose_name = 'Library Resource'
        verbose_name_plural = 'Library Resources'

    def __str__(self):
        return self.title_en


# ---------------------------------------------------------------------------
# Clubs & Sports (co-curricular)
# ---------------------------------------------------------------------------
class Club(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name_en = models.CharField(max_length=255)
    name_bn = models.CharField(max_length=255, blank=True)
    description_en = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    logo = models.ImageField(upload_to='website/clubs/', null=True, blank=True)
    moderator = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_clubs'
        verbose_name = 'Club'
        verbose_name_plural = 'Clubs'

    def __str__(self):
        return self.name_en


class SportsItem(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    description_en = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    image = models.ImageField(upload_to='website/sports/', null=True, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_sports'
        verbose_name = 'Sports Item'
        verbose_name_plural = 'Sports Items'

    def __str__(self):
        return self.title_en


# ---------------------------------------------------------------------------
# Achievements & Research (also writable by teachers — see created_by/department)
# ---------------------------------------------------------------------------
class Achievement(PublishableModel):
    CATEGORY_CHOICES = [
        ('institute', 'Institute'),
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('department', 'Department'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    description_en = models.TextField(blank=True)
    description_bn = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='institute')
    image = models.ImageField(upload_to='website/achievements/', null=True, blank=True)
    achieved_on = models.DateField(null=True, blank=True)
    department = models.ForeignKey(
        'departments.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='website_achievements',
    )
    # Teacher-authored entries are owned here so the teacher UI can scope to
    # "my" records; institute-level entries created by admins leave it null.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='website_achievements',
    )

    class Meta(PublishableModel.Meta):
        db_table = 'website_achievements'
        ordering = ['order', '-achieved_on', '-created_at']
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'

    def __str__(self):
        return self.title_en


class ResearchProject(PublishableModel):
    STATUS_CHOICES = [
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('published', 'Published'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    abstract_en = models.TextField(blank=True)
    abstract_bn = models.TextField(blank=True)
    authors = models.CharField(max_length=500, blank=True, help_text="Comma-separated author names.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ongoing')
    year = models.CharField(max_length=4, blank=True)
    link = models.URLField(blank=True)
    file = models.FileField(upload_to='website/research/', null=True, blank=True)
    department = models.ForeignKey(
        'departments.Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='website_research',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='website_research',
    )

    class Meta(PublishableModel.Meta):
        db_table = 'website_research_projects'
        ordering = ['order', '-year', '-created_at']
        verbose_name = 'Research Project'
        verbose_name_plural = 'Research Projects'

    def __str__(self):
        return self.title_en


# ---------------------------------------------------------------------------
# Supporting content
# ---------------------------------------------------------------------------
class Testimonial(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name_en = models.CharField(max_length=255)
    name_bn = models.CharField(max_length=255, blank=True)
    role_en = models.CharField(max_length=255, blank=True, help_text="e.g. 'Alumnus, CMT 2019'.")
    role_bn = models.CharField(max_length=255, blank=True)
    quote_en = models.TextField()
    quote_bn = models.TextField(blank=True)
    photo = models.ImageField(upload_to='website/testimonials/', null=True, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_testimonials'
        verbose_name = 'Testimonial'
        verbose_name_plural = 'Testimonials'

    def __str__(self):
        return self.name_en


class FAQ(PublishableModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question_en = models.CharField(max_length=500)
    question_bn = models.CharField(max_length=500, blank=True)
    answer_en = models.TextField()
    answer_bn = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'website_faqs'
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question_en


class PageContent(TimeStampedModel):
    """Generic key -> rich-text store for static pages (Privacy, Terms, etc.)
    so they stay editable from the admin without code changes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.SlugField(max_length=100, unique=True, help_text="e.g. 'privacy', 'terms'.")
    title_en = models.CharField(max_length=255)
    title_bn = models.CharField(max_length=255, blank=True)
    body_en = models.TextField(blank=True)
    body_bn = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        db_table = 'website_page_content'
        verbose_name = 'Page Content'
        verbose_name_plural = 'Page Content'

    def __str__(self):
        return self.key
