"""
Department Serializers
"""
from rest_framework import serializers
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department model
    """
    studentCount = serializers.IntegerField(source='student_count', read_only=True)
    teacherCount = serializers.IntegerField(source='teacher_count', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'createdAt', 'updatedAt', 'studentCount', 'teacherCount']
        read_only_fields = ['id', 'createdAt', 'updatedAt']

    def validate_name(self, value):
        """Validate department name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Department name cannot be empty")
        return value.strip()

    def validate_code(self, value):
        """Validate department code is not empty and uppercase"""
        if not value or not value.strip():
            raise serializers.ValidationError("Department code cannot be empty")
        return value.strip().upper()


class DepartmentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing departments
    """
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']
