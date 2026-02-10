"""
Stipend Serializers
"""
from rest_framework import serializers
from .models import StipendCriteria, StipendEligibility
from apps.students.models import Student
from apps.departments.models import Department


class StipendCriteriaSerializer(serializers.ModelSerializer):
    """Serializer for StipendCriteria model"""
    departmentName = serializers.CharField(source='department.name', read_only=True)
    createdByName = serializers.CharField(source='createdBy.username', read_only=True)
    
    class Meta:
        model = StipendCriteria
        fields = [
            'id', 'name', 'description', 'minAttendance', 'minGpa', 
            'passRequirement', 'department', 'departmentName', 'semester', 
            'shift', 'session', 'isActive', 'createdAt', 'updatedAt',
            'createdBy', 'createdByName'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt', 'createdBy']


class EligibleStudentSerializer(serializers.Serializer):
    """Serializer for eligible student data"""
    id = serializers.UUIDField()
    name = serializers.CharField(source='fullNameEnglish')
    nameBangla = serializers.CharField(source='fullNameBangla')
    roll = serializers.CharField(source='currentRollNumber')
    department = serializers.SerializerMethodField()
    semester = serializers.IntegerField()
    session = serializers.CharField()
    shift = serializers.CharField()
    photo = serializers.CharField(source='profilePhoto', allow_null=True)
    attendance = serializers.DecimalField(max_digits=5, decimal_places=2)
    gpa = serializers.DecimalField(max_digits=4, decimal_places=2)
    cgpa = serializers.DecimalField(max_digits=4, decimal_places=2)
    referredSubjects = serializers.IntegerField()
    totalSubjects = serializers.IntegerField()
    passedSubjects = serializers.IntegerField()
    rank = serializers.IntegerField(allow_null=True)
    
    def get_department(self, obj):
        if hasattr(obj, 'department') and obj.department:
            return obj.department.name
        return 'Unknown'


class StipendEligibilitySerializer(serializers.ModelSerializer):
    """Serializer for StipendEligibility model"""
    studentName = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    studentRoll = serializers.CharField(source='student.currentRollNumber', read_only=True)
    criteriaName = serializers.CharField(source='criteria.name', read_only=True)
    approvedByName = serializers.CharField(source='approvedBy.username', read_only=True)
    
    class Meta:
        model = StipendEligibility
        fields = [
            'id', 'student', 'studentName', 'studentRoll', 'criteria', 
            'criteriaName', 'attendance', 'gpa', 'cgpa', 'referredSubjects',
            'totalSubjects', 'passedSubjects', 'rank', 'isEligible', 
            'isApproved', 'approvedBy', 'approvedByName', 'approvedAt',
            'notes', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt', 'rank']


class StipendEligibilityDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for StipendEligibility with student info"""
    student = EligibleStudentSerializer(read_only=True)
    criteria = StipendCriteriaSerializer(read_only=True)
    approvedByName = serializers.CharField(source='approvedBy.username', read_only=True)
    
    class Meta:
        model = StipendEligibility
        fields = [
            'id', 'student', 'criteria', 'attendance', 'gpa', 'cgpa',
            'referredSubjects', 'totalSubjects', 'passedSubjects', 'rank',
            'isEligible', 'isApproved', 'approvedBy', 'approvedByName',
            'approvedAt', 'notes', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']
