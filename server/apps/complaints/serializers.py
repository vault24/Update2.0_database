"""
Complaints Serializers
"""
from rest_framework import serializers
from .models import (
    ComplaintCategory, ComplaintSubcategory, Complaint, ComplaintUpdate,
    ComplaintComment, ComplaintEscalation, ComplaintTemplate, ComplaintAnalytics
)


class ComplaintCategorySerializer(serializers.ModelSerializer):
    """Complaint category serializer"""
    subcategories_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintCategory
        fields = [
            'id', 'name', 'label', 'description', 'icon', 'color',
            'is_active', 'sort_order', 'subcategories_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'subcategories_count', 'created_at', 'updated_at']
    
    def get_subcategories_count(self, obj):
        return obj.subcategories.filter(is_active=True).count()


class ComplaintSubcategorySerializer(serializers.ModelSerializer):
    """Complaint subcategory serializer"""
    category_name = serializers.CharField(source='category.label', read_only=True)
    
    class Meta:
        model = ComplaintSubcategory
        fields = [
            'id', 'category', 'category_name', 'name', 'description',
            'is_active', 'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ComplaintSerializer(serializers.ModelSerializer):
    """Complaint serializer"""
    category_name = serializers.CharField(source='category.label', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    reporter_name_display = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.fullNameEnglish', read_only=True)
    responded_by_name = serializers.CharField(source='responded_by.fullNameEnglish', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Complaint
        fields = [
            'id', 'title', 'description', 'category', 'category_name',
            'subcategory', 'subcategory_name', 'student', 'teacher',
            'is_anonymous', 'reporter_name', 'reporter_email', 'reporter_name_display',
            'status', 'priority', 'assigned_to', 'assigned_to_name',
            'department', 'department_name', 'attachments',
            'response', 'resolution_notes', 'responded_by', 'responded_by_name',
            'responded_at', 'resolved_at', 'satisfaction_rating', 'feedback_comment',
            'reference_number', 'view_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reference_number', 'view_count', 'reporter_name_display',
            'responded_at', 'resolved_at', 'created_at', 'updated_at'
        ]
    
    def get_reporter_name_display(self, obj):
        if obj.is_anonymous:
            return "Anonymous"
        elif obj.student:
            return obj.student.fullNameEnglish
        elif obj.teacher:
            return obj.teacher.fullNameEnglish
        else:
            return obj.reporter_name or "Unknown"


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    """Complaint update serializer"""
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintUpdate
        fields = [
            'id', 'complaint', 'update_type', 'description',
            'updated_by_student', 'updated_by_teacher', 'updated_by_admin', 'updated_by_name',
            'previous_value', 'new_value', 'attachments', 'created_at'
        ]
        read_only_fields = ['id', 'updated_by_name', 'created_at']
    
    def get_updated_by_name(self, obj):
        if obj.updated_by_student:
            return obj.updated_by_student.fullNameEnglish
        elif obj.updated_by_teacher:
            return obj.updated_by_teacher.name
        elif obj.updated_by_admin:
            return "System Admin"
        else:
            return "System"


class ComplaintCommentSerializer(serializers.ModelSerializer):
    """Complaint comment serializer"""
    replies = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintComment
        fields = [
            'id', 'complaint', 'content', 'comment_type',
            'author_student', 'author_teacher', 'author_name',
            'parent_comment', 'attachments', 'is_visible_to_reporter',
            'is_edited', 'edited_at', 'replies', 'replies_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author_name', 'is_edited', 'edited_at', 'replies', 'replies_count', 'created_at', 'updated_at']
    
    def get_replies(self, obj):
        if obj.replies.exists():
            return ComplaintCommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []
    
    def get_replies_count(self, obj):
        return obj.replies.count()


class ComplaintEscalationSerializer(serializers.ModelSerializer):
    """Complaint escalation serializer"""
    escalated_from_name = serializers.CharField(source='escalated_from.fullNameEnglish', read_only=True)
    escalated_to_name = serializers.CharField(source='escalated_to.fullNameEnglish', read_only=True)
    escalated_to_department_name = serializers.CharField(source='escalated_to_department.name', read_only=True)
    escalated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintEscalation
        fields = [
            'id', 'complaint', 'reason', 'description',
            'escalated_from', 'escalated_from_name', 'escalated_to', 'escalated_to_name',
            'escalated_to_department', 'escalated_to_department_name',
            'escalated_by_student', 'escalated_by_teacher', 'escalated_by_system', 'escalated_by_name',
            'is_resolved', 'resolved_at', 'created_at'
        ]
        read_only_fields = ['id', 'escalated_by_name', 'resolved_at', 'created_at']
    
    def get_escalated_by_name(self, obj):
        if obj.escalated_by_student:
            return obj.escalated_by_student.fullNameEnglish
        elif obj.escalated_by_teacher:
            return obj.escalated_by_teacher.name
        elif obj.escalated_by_system:
            return "System (Automatic)"
        else:
            return "Unknown"


class ComplaintTemplateSerializer(serializers.ModelSerializer):
    """Complaint template serializer"""
    category_name = serializers.CharField(source='category.label', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.fullNameEnglish', read_only=True)
    
    class Meta:
        model = ComplaintTemplate
        fields = [
            'id', 'title', 'content', 'category', 'category_name',
            'subcategory', 'subcategory_name', 'usage_count', 'is_active',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']


class ComplaintAnalyticsSerializer(serializers.ModelSerializer):
    """Complaint analytics serializer"""
    
    class Meta:
        model = ComplaintAnalytics
        fields = [
            'id', 'date', 'period_type', 'total_complaints', 'new_complaints',
            'resolved_complaints', 'pending_complaints', 'avg_response_time',
            'avg_resolution_time', 'avg_satisfaction_rating', 'total_ratings',
            'category_breakdown', 'department_breakdown', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# Detailed serializers
class ComplaintDetailSerializer(ComplaintSerializer):
    """Detailed complaint serializer with updates and comments"""
    updates = ComplaintUpdateSerializer(many=True, read_only=True)
    comments = ComplaintCommentSerializer(many=True, read_only=True)
    escalations = ComplaintEscalationSerializer(many=True, read_only=True)
    category_detail = ComplaintCategorySerializer(source='category', read_only=True)
    subcategory_detail = ComplaintSubcategorySerializer(source='subcategory', read_only=True)
    
    class Meta(ComplaintSerializer.Meta):
        fields = ComplaintSerializer.Meta.fields + [
            'updates', 'comments', 'escalations', 'category_detail', 'subcategory_detail'
        ]


class ComplaintCategoryDetailSerializer(ComplaintCategorySerializer):
    """Detailed category serializer with subcategories"""
    subcategories = ComplaintSubcategorySerializer(many=True, read_only=True)
    
    class Meta(ComplaintCategorySerializer.Meta):
        fields = ComplaintCategorySerializer.Meta.fields + ['subcategories']


# Summary serializers for dashboard
class ComplaintSummarySerializer(serializers.ModelSerializer):
    """Summary serializer for dashboard"""
    category_name = serializers.CharField(source='category.label', read_only=True)
    
    class Meta:
        model = Complaint
        fields = [
            'id', 'title', 'category_name', 'status', 'priority',
            'reference_number', 'created_at'
        ]


# Create/Update serializers
class ComplaintCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating complaints"""
    
    class Meta:
        model = Complaint
        fields = [
            'title', 'description', 'category', 'subcategory',
            'is_anonymous', 'reporter_name', 'reporter_email', 'attachments'
        ]
    
    def create(self, validated_data):
        # Set the student/teacher based on the request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if user.role in ['student', 'captain'] and user.related_profile_id:
                from apps.students.models import Student
                student_profile = Student.objects.filter(id=user.related_profile_id).first()
                if student_profile:
                    validated_data['student'] = student_profile
            elif user.role == 'teacher' and user.related_profile_id:
                from apps.teachers.models import Teacher
                teacher_profile = Teacher.objects.filter(id=user.related_profile_id).first()
                if teacher_profile:
                    validated_data['teacher'] = teacher_profile
        
        return super().create(validated_data)


class ComplaintResponseSerializer(serializers.ModelSerializer):
    """Serializer for responding to complaints"""
    
    class Meta:
        model = Complaint
        fields = ['response', 'status']
    
    def update(self, instance, validated_data):
        # Set response metadata
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if user.role == 'teacher' and user.related_profile_id:
                from apps.teachers.models import Teacher
                teacher_profile = Teacher.objects.filter(id=user.related_profile_id).first()
                if teacher_profile:
                    instance.responded_by = teacher_profile
            from django.utils import timezone
            instance.responded_at = timezone.now()
            
            if validated_data.get('status') == 'resolved':
                instance.resolved_at = timezone.now()
        
        return super().update(instance, validated_data)
