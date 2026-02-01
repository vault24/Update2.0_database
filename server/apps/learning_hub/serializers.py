"""
Learning Hub Serializers
"""
from rest_framework import serializers
from .models import (
    Subject, ClassActivity, Assignment, AssignmentSubmission,
    StudyMaterial, MaterialAccess
)


class SubjectSerializer(serializers.ModelSerializer):
    """Subject serializer"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'department', 'department_name',
            'semester', 'teacher', 'teacher_name', 'color', 'description',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassActivitySerializer(serializers.ModelSerializer):
    """Class activity serializer"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_color = serializers.CharField(source='subject.color', read_only=True)
    
    class Meta:
        model = ClassActivity
        fields = [
            'id', 'subject', 'subject_name', 'subject_code', 'subject_color',
            'title', 'description', 'activity_type', 'status',
            'scheduled_date', 'start_time', 'end_time', 'location',
            'topics_covered', 'materials', 'notes',
            'attendance_taken', 'total_students', 'present_students',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssignmentSerializer(serializers.ModelSerializer):
    """Assignment serializer"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.CharField(source='subject.teacher.name', read_only=True)
    
    class Meta:
        model = Assignment
        fields = [
            'id', 'subject', 'subject_name', 'subject_code', 'teacher_name',
            'title', 'description', 'instructions',
            'assigned_date', 'deadline', 'priority',
            'max_marks', 'weightage', 'attachments',
            'status', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'assigned_date', 'created_at', 'updated_at']


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    """Assignment submission serializer"""
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    student_roll = serializers.CharField(source='student.currentRollNumber', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.name', read_only=True)
    
    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'student', 'student_name', 'student_roll',
            'submission_text', 'attachments', 'submitted_at', 'is_late',
            'marks_obtained', 'grade', 'feedback', 'graded_at', 'graded_by', 'graded_by_name',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_late', 'graded_at', 'created_at', 'updated_at']


class StudyMaterialSerializer(serializers.ModelSerializer):
    """Study material serializer"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)
    
    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'description', 'subject', 'subject_name', 'subject_code',
            'department', 'department_name', 'semester', 'shift',
            'material_type', 'file_path', 'file_size', 'duration',
            'uploaded_by', 'uploaded_by_name', 'upload_date', 'last_accessed', 'access_count',
            'is_public', 'allowed_semesters', 'tags',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'upload_date', 'last_accessed', 'access_count', 'created_at', 'updated_at']


class MaterialAccessSerializer(serializers.ModelSerializer):
    """Material access tracking serializer"""
    material_title = serializers.CharField(source='material.title', read_only=True)
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    
    class Meta:
        model = MaterialAccess
        fields = [
            'id', 'material', 'material_title', 'student', 'student_name',
            'accessed_at', 'duration_seconds', 'completed'
        ]
        read_only_fields = ['id', 'accessed_at']


# Detailed serializers for specific views
class AssignmentDetailSerializer(AssignmentSerializer):
    """Detailed assignment serializer with submissions"""
    submissions_count = serializers.SerializerMethodField()
    my_submission = serializers.SerializerMethodField()
    
    class Meta(AssignmentSerializer.Meta):
        fields = AssignmentSerializer.Meta.fields + ['submissions_count', 'my_submission']
    
    def get_submissions_count(self, obj):
        return obj.submissions.count()
    
    def get_my_submission(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'student_profile'):
            try:
                submission = obj.submissions.get(student=request.user.student_profile)
                return AssignmentSubmissionSerializer(submission).data
            except AssignmentSubmission.DoesNotExist:
                return None
        return None


class StudyMaterialDetailSerializer(StudyMaterialSerializer):
    """Detailed study material serializer with access info"""
    my_access = serializers.SerializerMethodField()
    total_accesses = serializers.SerializerMethodField()
    
    class Meta(StudyMaterialSerializer.Meta):
        fields = StudyMaterialSerializer.Meta.fields + ['my_access', 'total_accesses']
    
    def get_my_access(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'student_profile'):
            try:
                access = obj.accesses.filter(student=request.user.student_profile).latest('accessed_at')
                return MaterialAccessSerializer(access).data
            except MaterialAccess.DoesNotExist:
                return None
        return None
    
    def get_total_accesses(self, obj):
        return obj.accesses.count()


class ClassActivityDetailSerializer(ClassActivitySerializer):
    """Detailed class activity serializer"""
    materials_detail = serializers.SerializerMethodField()
    
    class Meta(ClassActivitySerializer.Meta):
        fields = ClassActivitySerializer.Meta.fields + ['materials_detail']
    
    def get_materials_detail(self, obj):
        if obj.materials:
            # Assuming materials contains IDs of StudyMaterial objects
            material_ids = obj.materials
            materials = StudyMaterial.objects.filter(id__in=material_ids)
            return StudyMaterialSerializer(materials, many=True, context=self.context).data
        return []