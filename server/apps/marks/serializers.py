from rest_framework import serializers
from .models import MarksRecord


class MarksRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = MarksRecord
        fields = '__all__'
        read_only_fields = ['id', 'recorded_at']
    
    def get_percentage(self, obj):
        return obj.percentage()


class MarksCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarksRecord
        fields = ['student', 'subject_code', 'subject_name', 'semester', 'exam_type', 'marks_obtained', 'total_marks', 'recorded_by', 'remarks']
    
    def validate(self, data):
        if data['marks_obtained'] > data['total_marks']:
            raise serializers.ValidationError("Marks obtained cannot exceed total marks")
        return data
