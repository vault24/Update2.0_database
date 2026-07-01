"""
Alumni Serializers
"""
from rest_framework import serializers
from .models import Alumni
from apps.students.serializers import StudentDetailSerializer


class CareerPositionSerializer(serializers.Serializer):
    """
    Serializer for career position entries
    """
    id = serializers.CharField(required=False, allow_blank=True)
    positionType = serializers.CharField(max_length=50)
    organizationName = serializers.CharField(max_length=255)
    positionTitle = serializers.CharField(max_length=255)
    startDate = serializers.DateField()
    endDate = serializers.DateField(required=False, allow_null=True)
    isCurrent = serializers.BooleanField(required=False, default=False)
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    
    # Job-specific fields
    salary = serializers.CharField(required=False, allow_blank=True)
    
    # Higher studies specific fields
    degree = serializers.CharField(required=False, allow_blank=True)
    field = serializers.CharField(required=False, allow_blank=True)
    institution = serializers.CharField(required=False, allow_blank=True)
    
    # Business specific fields
    businessName = serializers.CharField(required=False, allow_blank=True)
    businessType = serializers.CharField(required=False, allow_blank=True)
    
    # Other specific fields
    otherType = serializers.CharField(required=False, allow_blank=True)


class SupportHistorySerializer(serializers.Serializer):
    """
    Serializer for support history entries
    """
    date = serializers.DateTimeField()
    previousCategory = serializers.CharField()
    newCategory = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


class AlumniSerializer(serializers.ModelSerializer):
    """
    Complete alumni serializer with student details
    """
    student = StudentDetailSerializer(read_only=True)
    careerHistory = CareerPositionSerializer(many=True, read_only=True)
    supportHistory = SupportHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Alumni
        fields = [
            'student',
            'alumniType',
            'transitionDate',
            'graduationYear',
            'currentSupportCategory',
            'currentPosition',
            'careerHistory',
            'supportHistory',
            'bio',
            'linkedinUrl',
            'portfolioUrl',
            'coverImage',
            'skills',
            'highlights',
            'courses',
            'registrationSource',
            'reviewStatus',
            'isVerified',
            'lastEditedAt',
            'lastEditedBy',
            'verificationNotes',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['transitionDate', 'createdAt', 'updatedAt', 'isVerified', 'lastEditedAt', 'lastEditedBy']


class AlumniCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating alumni records
    """
    class Meta:
        model = Alumni
        fields = [
            'student',
            'alumniType',
            'graduationYear',
            'currentSupportCategory',
            'currentPosition',
        ]


class AlumniUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating alumni records
    """
    class Meta:
        model = Alumni
        fields = [
            'alumniType',
            'graduationYear',
            'currentSupportCategory',
            'currentPosition',
        ]


class AlumniDirectorySerializer(serializers.ModelSerializer):
    """
    Lightweight, privacy-conscious serializer for the alumni directory.

    Exposes only the fields appropriate for peer discovery/networking — no
    email, phone, support category or other sensitive student PII.
    """
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    currentPosition = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = Alumni
        fields = [
            'id', 'name', 'department', 'graduationYear', 'alumniType',
            'isVerified', 'coverImage', 'avatar', 'location',
            'currentPosition', 'skills',
        ]

    def get_id(self, obj):
        return str(obj.student_id)

    def get_name(self, obj):
        return obj.student.fullNameEnglish or ''

    def get_department(self, obj):
        return obj.student.department.name if obj.student.department_id else ''

    def get_avatar(self, obj):
        return obj.student.profilePhoto or ''

    def get_location(self, obj):
        addr = obj.student.presentAddress or {}
        if isinstance(addr, dict):
            return addr.get('district') or ''
        return addr or ''

    def get_currentPosition(self, obj):
        cp = obj.currentPosition or {}
        return {
            'title': cp.get('positionTitle') or cp.get('position') or '',
            'organization': cp.get('organizationName') or cp.get('company') or '',
        }

    def get_skills(self, obj):
        return [s.get('name') for s in (obj.skills or []) if s.get('name')][:6]


class AlumniPublicProfileSerializer(AlumniDirectorySerializer):
    """
    Richer public profile for the directory detail view. Extends the directory
    card with a bio, full career/skill/highlight lists and networking contact
    details (email + professional links) so peers can actually reach out.
    """
    bio = serializers.CharField(read_only=True)
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    linkedin = serializers.CharField(source='linkedinUrl', read_only=True)
    portfolio = serializers.CharField(source='portfolioUrl', read_only=True)
    careers = serializers.SerializerMethodField()
    highlights = serializers.SerializerMethodField()
    allSkills = serializers.SerializerMethodField()

    class Meta(AlumniDirectorySerializer.Meta):
        fields = AlumniDirectorySerializer.Meta.fields + [
            'bio', 'email', 'phone', 'linkedin', 'portfolio',
            'careers', 'highlights', 'allSkills',
        ]

    def get_email(self, obj):
        return obj.student.email or ''

    def get_phone(self, obj):
        return obj.student.mobileStudent or ''

    def get_careers(self, obj):
        careers = obj.careerHistory or []
        result = []
        for c in careers:
            result.append({
                'id': c.get('id', ''),
                'type': c.get('positionType', ''),
                'title': c.get('positionTitle') or c.get('degree') or c.get('businessName') or '',
                'organization': c.get('organizationName') or c.get('institution') or c.get('businessType') or '',
                'location': c.get('location', ''),
                'startDate': c.get('startDate', ''),
                'endDate': c.get('endDate', ''),
                'isCurrent': c.get('isCurrent', False),
            })
        return result

    def get_highlights(self, obj):
        return [
            {
                'title': h.get('title', ''),
                'description': h.get('description', ''),
                'date': h.get('date', ''),
                'type': h.get('type', ''),
            }
            for h in (obj.highlights or [])
        ]

    def get_allSkills(self, obj):
        return [
            {'name': s.get('name', ''), 'category': s.get('category', ''), 'proficiency': s.get('proficiency', 0)}
            for s in (obj.skills or []) if s.get('name')
        ]


class AlumniStatsSerializer(serializers.Serializer):
    """
    Serializer for alumni statistics
    """
    totalAlumni = serializers.IntegerField()
    byAlumniType = serializers.DictField()
    bySupportCategory = serializers.DictField()
    byGraduationYear = serializers.DictField()
    byPositionType = serializers.DictField()


class AddCareerPositionSerializer(serializers.Serializer):
    """
    Serializer for adding career positions
    """
    positionType = serializers.CharField(max_length=50)
    organizationName = serializers.CharField(max_length=255)
    positionTitle = serializers.CharField(max_length=255)
    startDate = serializers.DateField()
    endDate = serializers.DateField(required=False, allow_null=True)
    isCurrent = serializers.BooleanField(required=False, default=False)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    location = serializers.CharField(required=False, allow_blank=True, default='')
    
    # Job-specific fields
    salary = serializers.CharField(required=False, allow_blank=True, default='')
    
    # Higher studies specific fields
    degree = serializers.CharField(required=False, allow_blank=True, default='')
    field = serializers.CharField(required=False, allow_blank=True, default='')
    institution = serializers.CharField(required=False, allow_blank=True, default='')
    
    # Business specific fields
    businessName = serializers.CharField(required=False, allow_blank=True, default='')
    businessType = serializers.CharField(required=False, allow_blank=True, default='')
    
    # Other specific fields
    otherType = serializers.CharField(required=False, allow_blank=True, default='')


class UpdateSupportCategorySerializer(serializers.Serializer):
    """
    Serializer for updating support category
    """
    category = serializers.ChoiceField(choices=Alumni.SUPPORT_CATEGORY_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
