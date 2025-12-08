"""
Class Routine Serializers
"""
from rest_framework import serializers
from .models import ClassRoutine
from apps.departments.serializers import DepartmentSerializer
from apps.teachers.serializers import TeacherListSerializer


class ClassRoutineSerializer(serializers.ModelSerializer):
    """
    Complete serializer for class routine with nested data
    """
    department = DepartmentSerializer(read_only=True)
    teacher = TeacherListSerializer(read_only=True)
    
    class Meta:
        model = ClassRoutine
        fields = [
            'id',
            'department',
            'semester',
            'shift',
            'session',
            'day_of_week',
            'start_time',
            'end_time',
            'subject_name',
            'subject_code',
            'teacher',
            'room_number',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassRoutineCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating class routines
    """
    class Meta:
        model = ClassRoutine
        fields = [
            'department',
            'semester',
            'shift',
            'session',
            'day_of_week',
            'start_time',
            'end_time',
            'subject_name',
            'subject_code',
            'teacher',
            'room_number',
            'is_active',
        ]
    
    def validate(self, data):
        """Validate time slots"""
        if data['end_time'] <= data['start_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })
        return data


class ClassRoutineUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating class routines
    """
    class Meta:
        model = ClassRoutine
        fields = [
            'semester',
            'shift',
            'session',
            'day_of_week',
            'start_time',
            'end_time',
            'subject_name',
            'subject_code',
            'teacher',
            'room_number',
            'is_active',
        ]
    
    def validate(self, data):
        """Validate time slots"""
        start_time = data.get('start_time', self.instance.start_time if self.instance else None)
        end_time = data.get('end_time', self.instance.end_time if self.instance else None)
        
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })
        return data
