from rest_framework import serializers
from .models import AttendanceRecord
from apps.class_routines.models import ClassRoutine


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.fullNameEnglish', read_only=True)
    student_roll = serializers.CharField(source='student.currentRollNumber', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    routine_details = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceRecord
        fields = '__all__'
        read_only_fields = ['id', 'recorded_at', 'approved_at']
    
    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            # Try to get the related profile name (student/teacher)
            if obj.recorded_by.role in ['student', 'captain'] and obj.recorded_by.related_profile_id:
                try:
                    from apps.students.models import Student
                    student = Student.objects.get(id=obj.recorded_by.related_profile_id)
                    return student.fullNameEnglish
                except:
                    pass
            elif obj.recorded_by.role == 'teacher' and obj.recorded_by.related_profile_id:
                try:
                    from apps.teachers.models import Teacher
                    teacher = Teacher.objects.get(id=obj.recorded_by.related_profile_id)
                    return teacher.fullNameEnglish
                except:
                    pass
            # Fallback to username
            return obj.recorded_by.username
        return None
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            # Try to get the related profile name (teacher)
            if obj.approved_by.role == 'teacher' and obj.approved_by.related_profile_id:
                try:
                    from apps.teachers.models import Teacher
                    teacher = Teacher.objects.get(id=obj.approved_by.related_profile_id)
                    return teacher.fullNameEnglish
                except:
                    pass
            # Fallback to username
            return obj.approved_by.username
        return None
    
    def get_routine_details(self, obj):
        if obj.class_routine:
            return {
                'id': str(obj.class_routine.id),
                'subject_name': obj.class_routine.subject_name,
                'subject_code': obj.class_routine.subject_code,
                'start_time': obj.class_routine.start_time.strftime('%H:%M'),
                'end_time': obj.class_routine.end_time.strftime('%H:%M'),
                'day_of_week': obj.class_routine.day_of_week,
            }
        return None


class AttendanceCreateSerializer(serializers.ModelSerializer):
    class_routine_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = [
            'student', 'subject_code', 'subject_name', 'semester', 
            'date', 'is_present', 'recorded_by', 'notes', 'status',
            'class_routine_id'
        ]
        extra_kwargs = {
            'recorded_by': {'required': False, 'allow_null': True},
            'notes': {'required': False, 'allow_blank': True, 'allow_null': True},
            'status': {'required': False},
        }
    
    def validate(self, attrs):
        """
        Skip unique constraint validation since bulk_create handles updates
        """
        # Remove unique_together validation for bulk operations
        # The view will handle updating existing records
        return attrs
    
    def create(self, validated_data):
        routine_id = validated_data.pop('class_routine_id', None)
        if routine_id:
            try:
                routine = ClassRoutine.objects.get(id=routine_id)
                validated_data['class_routine'] = routine
            except ClassRoutine.DoesNotExist:
                pass
        
        # Set recorded_by to current user if not provided
        if 'recorded_by' not in validated_data or validated_data['recorded_by'] is None:
            request = self.context.get('request')
            if request and hasattr(request, 'user'):
                validated_data['recorded_by'] = request.user
        
        return super().create(validated_data)


class BulkAttendanceCreateSerializer(serializers.Serializer):
    records = AttendanceCreateSerializer(many=True)
    class_routine_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_records(self, value):
        """Pass context to nested serializers"""
        for record_serializer in self.fields['records'].child.validators:
            if hasattr(record_serializer, 'set_context'):
                record_serializer.set_context(self.context)
        return value


class AttendanceApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    attendance_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True
    )
