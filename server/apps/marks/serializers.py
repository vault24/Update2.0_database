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
    subject_code = serializers.CharField(required=False, allow_blank=True)
    subject_name = serializers.CharField(required=False, allow_blank=True)
    semester = serializers.IntegerField(required=False)
    exam_type = serializers.CharField(required=False, allow_blank=True)
    marks_obtained = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    total_marks = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    recorded_by = serializers.CharField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = MarksRecord
        fields = ['student', 'subject_code', 'subject_name', 'semester', 'exam_type', 'marks_obtained', 'total_marks', 'recorded_by', 'remarks']
    
    def validate(self, data):
        marks_obtained = data.get('marks_obtained', 0)
        total_marks = data.get('total_marks', 0)
        if marks_obtained and total_marks and marks_obtained > total_marks:
            raise serializers.ValidationError("Marks obtained cannot exceed total marks")
        return data
