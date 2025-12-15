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
            'skills',
            'highlights',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['transitionDate', 'createdAt', 'updatedAt']


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
