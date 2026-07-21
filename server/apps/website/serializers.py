"""Public, read-only serializers for the website.

Two groups:
  1. CMS serializers over this app's own models.
  2. Public serializers over EXISTING models (Teacher, Department, Notice) that
     expose ONLY safe, directory-appropriate fields — never PII beyond a public
     faculty directory, never private student data.

Image/file fields are rendered as absolute URLs via the request in context.
"""
from rest_framework import serializers

from apps.departments.models import Department
from apps.notices.models import Notice
from apps.teachers.models import Teacher

from .models import (
    Achievement, Club, Download, Event, FAQ, GalleryAlbum, GalleryImage,
    HeroSlide, LibraryResource, NewsPost, PageContent, ResearchProject,
    SiteSetting, SportsItem, Testimonial,
)


class _AbsoluteFileMixin:
    """Helper to turn a FileField/ImageField into an absolute URL."""

    def _abs(self, field_file):
        if not field_file:
            return None
        url = field_file.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url


# ---------------------------------------------------------------------------
# CMS serializers
# ---------------------------------------------------------------------------
class HeroSlideSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = HeroSlide
        fields = [
            'id', 'image', 'headline_en', 'headline_bn', 'subtitle_en',
            'subtitle_bn', 'cta_label_en', 'cta_label_bn', 'cta_url', 'order',
        ]

    def get_image(self, obj):
        return self._abs(obj.image)


class EventSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title_en', 'title_bn', 'slug', 'description_en',
            'description_bn', 'category', 'cover_image', 'venue', 'start_at',
            'end_at', 'is_featured',
        ]

    def get_cover_image(self, obj):
        return self._abs(obj.cover_image)


class NewsPostSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = [
            'id', 'title_en', 'title_bn', 'slug', 'excerpt_en', 'excerpt_bn',
            'body_en', 'body_bn', 'cover_image', 'published_at', 'created_at',
        ]

    def get_cover_image(self, obj):
        return self._abs(obj.cover_image)


class GalleryImageSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = GalleryImage
        fields = ['id', 'image', 'caption_en', 'caption_bn', 'video_url', 'order']

    def get_image(self, obj):
        return self._abs(obj.image)


class GalleryAlbumSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = GalleryAlbum
        fields = [
            'id', 'title_en', 'title_bn', 'slug', 'description_en',
            'description_bn', 'cover_image', 'image_count', 'created_at',
        ]

    def get_cover_image(self, obj):
        return self._abs(obj.cover_image)

    def get_image_count(self, obj):
        return obj.images.filter(is_published=True).count()


class GalleryAlbumDetailSerializer(GalleryAlbumSerializer):
    images = serializers.SerializerMethodField()

    class Meta(GalleryAlbumSerializer.Meta):
        fields = GalleryAlbumSerializer.Meta.fields + ['images']

    def get_images(self, obj):
        qs = obj.images.filter(is_published=True)
        return GalleryImageSerializer(qs, many=True, context=self.context).data


class DownloadSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = Download
        fields = [
            'id', 'title_en', 'title_bn', 'description_en', 'description_bn',
            'category', 'file', 'file_size', 'download_count', 'updated_at',
        ]

    def get_file(self, obj):
        return self._abs(obj.file)

    def get_file_size(self, obj):
        try:
            return obj.file.size
        except (ValueError, OSError):
            return None


class LibraryResourceSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = LibraryResource
        fields = [
            'id', 'title_en', 'title_bn', 'description_en', 'description_bn',
            'resource_url', 'file', 'cover_image',
        ]

    def get_file(self, obj):
        return self._abs(obj.file)

    def get_cover_image(self, obj):
        return self._abs(obj.cover_image)


class ClubSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            'id', 'name_en', 'name_bn', 'description_en', 'description_bn',
            'logo', 'moderator', 'contact_email',
        ]

    def get_logo(self, obj):
        return self._abs(obj.logo)


class SportsItemSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = SportsItem
        fields = ['id', 'title_en', 'title_bn', 'description_en', 'description_bn', 'image']

    def get_image(self, obj):
        return self._abs(obj.image)


class AchievementSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', default=None, read_only=True)

    class Meta:
        model = Achievement
        fields = [
            'id', 'title_en', 'title_bn', 'description_en', 'description_bn',
            'category', 'image', 'achieved_on', 'department_name', 'created_at',
        ]

    def get_image(self, obj):
        return self._abs(obj.image)


class ResearchProjectSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', default=None, read_only=True)

    class Meta:
        model = ResearchProject
        fields = [
            'id', 'title_en', 'title_bn', 'abstract_en', 'abstract_bn',
            'authors', 'status', 'year', 'link', 'file', 'department_name', 'created_at',
        ]

    def get_file(self, obj):
        return self._abs(obj.file)


class TestimonialSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = ['id', 'name_en', 'name_bn', 'role_en', 'role_bn', 'quote_en', 'quote_bn', 'photo']

    def get_photo(self, obj):
        return self._abs(obj.photo)


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question_en', 'question_bn', 'answer_en', 'answer_bn', 'category']


class PageContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageContent
        fields = ['key', 'title_en', 'title_bn', 'body_en', 'body_bn', 'updated_at']


# ---------------------------------------------------------------------------
# Public serializers over EXISTING models (field-whitelisted)
# ---------------------------------------------------------------------------
class PublicDepartmentSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'head', 'established_year', 'photo',
            'student_count', 'teacher_count',
        ]

    def get_photo(self, obj):
        return self._abs(obj.photo)

    def get_student_count(self, obj):
        return obj.student_count()

    def get_teacher_count(self, obj):
        return obj.teacher_count()


class PublicTeacherSerializer(serializers.ModelSerializer):
    """Faculty-directory view of a teacher. Deliberately EXCLUDES mobileNumber
    and the linked user account. Email is included (public faculty directories
    standardly list professional emails), but personal contact stays private."""

    department_name = serializers.CharField(source='department.name', default=None, read_only=True)
    department_code = serializers.CharField(source='department.code', default=None, read_only=True)

    class Meta:
        model = Teacher
        fields = [
            'id', 'fullNameEnglish', 'fullNameBangla', 'designation',
            'department_name', 'department_code', 'qualifications',
            'specializations', 'subjects', 'skills', 'headline', 'about',
            'profilePhoto', 'coverPhoto', 'email', 'officeLocation',
            'employmentStatus',
        ]


class PublicTeacherDetailSerializer(PublicTeacherSerializer):
    education = serializers.SerializerMethodField()
    experiences = serializers.SerializerMethodField()

    class Meta(PublicTeacherSerializer.Meta):
        fields = PublicTeacherSerializer.Meta.fields + ['education', 'experiences']

    def get_education(self, obj):
        return list(
            obj.education.values('degree', 'institution', 'year', 'field', 'order')
        )

    def get_experiences(self, obj):
        return list(
            obj.experiences.values(
                'title', 'institution', 'location', 'startDate', 'endDate',
                'current', 'description', 'order',
            )
        )


class PublicNoticeAttachmentSerializer(_AbsoluteFileMixin, serializers.Serializer):
    id = serializers.IntegerField()
    file = serializers.SerializerMethodField()
    original_name = serializers.CharField()

    def get_file(self, obj):
        return self._abs(obj.file)


class PublicNoticeSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = ['id', 'title', 'content', 'priority', 'created_at', 'updated_at', 'attachments']

    def get_attachments(self, obj):
        return PublicNoticeAttachmentSerializer(
            obj.attachments.all(), many=True, context=self.context
        ).data


class SiteSettingSerializer(_AbsoluteFileMixin, serializers.ModelSerializer):
    """Public site settings, merged with institute info from system_settings."""

    principal_photo = serializers.SerializerMethodField()
    institute = serializers.SerializerMethodField()

    class Meta:
        model = SiteSetting
        exclude = ['updated_by']

    def get_principal_photo(self, obj):
        return self._abs(obj.principal_photo)

    def get_institute(self, obj):
        """Name/address/phone/email/logo come from the existing SystemSettings
        singleton — never re-stored here."""
        try:
            from apps.system_settings.models import SystemSettings
            s = SystemSettings.get_settings()
        except Exception:
            return None
        logo = None
        if getattr(s, 'institute_logo', None):
            try:
                logo = self._abs(s.institute_logo)
            except Exception:
                logo = None
        return {
            'name': s.institute_name,
            'address': s.institute_address,
            'phone': s.institute_phone,
            'email': s.institute_email,
            'logo': logo,
            'current_academic_year': s.current_academic_year,
        }
