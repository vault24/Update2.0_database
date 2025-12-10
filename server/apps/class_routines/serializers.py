"""
Class Routine Serializers
"""
from rest_framework import serializers
from django.db.models import Q
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
    
    def _check_time_overlap(self, start_time1, end_time1, start_time2, end_time2):
        """Check if two time periods overlap"""
        return start_time1 < end_time2 and start_time2 < end_time1
    
    def _validate_schedule_conflicts(self, data, instance=None):
        """Validate that the schedule doesn't conflict with existing routines"""
        day_of_week = data.get('day_of_week')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        teacher = data.get('teacher')
        room_number = data.get('room_number')
        department = data.get('department')
        semester = data.get('semester')
        shift = data.get('shift')
        
        if not all([day_of_week, start_time, end_time]):
            return  # Basic validation will catch missing fields
        
        # Build base query for existing routines on the same day
        base_query = Q(
            day_of_week=day_of_week,
            is_active=True
        )
        
        # Exclude current instance if updating
        if instance:
            base_query &= ~Q(id=instance.id)
        
        existing_routines = ClassRoutine.objects.filter(base_query)
        
        conflicts = []
        
        for routine in existing_routines:
            # Check if times overlap
            if self._check_time_overlap(start_time, end_time, routine.start_time, routine.end_time):
                
                # Check room conflict
                if room_number and routine.room_number == room_number:
                    conflicts.append({
                        'type': 'room_conflict',
                        'message': f'Room {room_number} is already booked on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number
                        },
                        'suggestion': f'Consider using a different room or time slot'
                    })
                
                # Check teacher conflict
                if teacher and routine.teacher_id == teacher.id:
                    conflicts.append({
                        'type': 'teacher_conflict',
                        'message': f'Teacher {teacher} is already assigned on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'teacher': routine.teacher.name if routine.teacher else 'Unknown'
                        },
                        'suggestion': f'Consider assigning a different teacher or time slot'
                    })
                
                # Check class conflict (same department, semester, shift)
                if (department and semester and shift and 
                    routine.department_id == department.id and 
                    routine.semester == semester and 
                    routine.shift == shift):
                    conflicts.append({
                        'type': 'class_conflict',
                        'message': f'Students of {department.name} Semester {semester} ({shift}) already have a class on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'department': routine.department.name,
                            'semester': routine.semester,
                            'shift': routine.shift
                        },
                        'suggestion': f'Consider scheduling at a different time'
                    })
        
        if conflicts:
            raise serializers.ValidationError({
                'schedule_conflicts': conflicts
            })
    
    def validate_semester(self, value):
        """Validate semester is within valid range"""
        if not (1 <= value <= 8):
            raise serializers.ValidationError(
                'Semester must be between 1 and 8',
                code='invalid_semester'
            )
        return value
    
    def validate_shift(self, value):
        """Validate shift is a valid choice"""
        valid_shifts = ['Morning', 'Day', 'Evening']
        if value not in valid_shifts:
            raise serializers.ValidationError(
                f'Shift must be one of: {", ".join(valid_shifts)}',
                code='invalid_shift'
            )
        return value
    
    def validate_day_of_week(self, value):
        """Validate day of week is a valid choice"""
        valid_days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
        if value not in valid_days:
            raise serializers.ValidationError(
                f'Day must be one of: {", ".join(valid_days)}',
                code='invalid_day'
            )
        return value
    
    def validate_subject_code(self, value):
        """Validate subject code format"""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError(
                'Subject code must be at least 2 characters long',
                code='invalid_subject_code'
            )
        return value.strip().upper()
    
    def validate_room_number(self, value):
        """Validate room number format"""
        if not value or len(value.strip()) < 1:
            raise serializers.ValidationError(
                'Room number is required',
                code='invalid_room_number'
            )
        return value.strip()
    
    def validate(self, data):
        """Validate time slots and schedule conflicts"""
        # Validate time relationship
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError({
                    'end_time': {
                        'message': 'End time must be after start time',
                        'code': 'invalid_time_range'
                    }
                })
            
            # Check minimum class duration (15 minutes)
            from datetime import datetime, timedelta
            duration = datetime.combine(datetime.today(), end_time) - datetime.combine(datetime.today(), start_time)
            if duration < timedelta(minutes=15):
                raise serializers.ValidationError({
                    'end_time': {
                        'message': 'Class duration must be at least 15 minutes',
                        'code': 'insufficient_duration'
                    }
                })
        
        # Check for schedule conflicts
        try:
            self._validate_schedule_conflicts(data)
        except serializers.ValidationError as e:
            # Re-raise with enhanced error structure
            if 'schedule_conflicts' in e.detail:
                raise serializers.ValidationError({
                    'non_field_errors': {
                        'message': 'Schedule conflicts detected',
                        'code': 'schedule_conflict',
                        'conflicts': e.detail['schedule_conflicts']
                    }
                })
            raise
        
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
    
    def _check_time_overlap(self, start_time1, end_time1, start_time2, end_time2):
        """Check if two time periods overlap"""
        return start_time1 < end_time2 and start_time2 < end_time1
    
    def _validate_schedule_conflicts(self, data, instance):
        """Validate that the schedule doesn't conflict with existing routines"""
        # Get current and new values
        day_of_week = data.get('day_of_week', instance.day_of_week)
        start_time = data.get('start_time', instance.start_time)
        end_time = data.get('end_time', instance.end_time)
        teacher = data.get('teacher', instance.teacher)
        room_number = data.get('room_number', instance.room_number)
        department = data.get('department', instance.department)
        semester = data.get('semester', instance.semester)
        shift = data.get('shift', instance.shift)
        
        if not all([day_of_week, start_time, end_time]):
            return  # Basic validation will catch missing fields
        
        # Build base query for existing routines on the same day, excluding current instance
        base_query = Q(
            day_of_week=day_of_week,
            is_active=True
        ) & ~Q(id=instance.id)
        
        existing_routines = ClassRoutine.objects.filter(base_query)
        
        conflicts = []
        
        for routine in existing_routines:
            # Check if times overlap
            if self._check_time_overlap(start_time, end_time, routine.start_time, routine.end_time):
                
                # Check room conflict
                if room_number and routine.room_number == room_number:
                    conflicts.append({
                        'type': 'room_conflict',
                        'message': f'Room {room_number} is already booked on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number
                        },
                        'suggestion': f'Consider using a different room or time slot'
                    })
                
                # Check teacher conflict
                if teacher and routine.teacher_id == teacher.id:
                    conflicts.append({
                        'type': 'teacher_conflict',
                        'message': f'Teacher {teacher} is already assigned on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'teacher': routine.teacher.name if routine.teacher else 'Unknown'
                        },
                        'suggestion': f'Consider assigning a different teacher or time slot'
                    })
                
                # Check class conflict (same department, semester, shift)
                if (department and semester and shift and 
                    routine.department_id == department.id and 
                    routine.semester == semester and 
                    routine.shift == shift):
                    conflicts.append({
                        'type': 'class_conflict',
                        'message': f'Students of {department.name} Semester {semester} ({shift}) already have a class on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'department': routine.department.name,
                            'semester': routine.semester,
                            'shift': routine.shift
                        },
                        'suggestion': f'Consider scheduling at a different time'
                    })
        
        if conflicts:
            raise serializers.ValidationError({
                'schedule_conflicts': conflicts
            })
    
    def validate_semester(self, value):
        """Validate semester is within valid range"""
        if not (1 <= value <= 8):
            raise serializers.ValidationError(
                'Semester must be between 1 and 8',
                code='invalid_semester'
            )
        return value
    
    def validate_shift(self, value):
        """Validate shift is a valid choice"""
        valid_shifts = ['Morning', 'Day', 'Evening']
        if value not in valid_shifts:
            raise serializers.ValidationError(
                f'Shift must be one of: {", ".join(valid_shifts)}',
                code='invalid_shift'
            )
        return value
    
    def validate_day_of_week(self, value):
        """Validate day of week is a valid choice"""
        valid_days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
        if value not in valid_days:
            raise serializers.ValidationError(
                f'Day must be one of: {", ".join(valid_days)}',
                code='invalid_day'
            )
        return value
    
    def validate_subject_code(self, value):
        """Validate subject code format"""
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError(
                'Subject code must be at least 2 characters long',
                code='invalid_subject_code'
            )
        return value.strip().upper() if value else value
    
    def validate_room_number(self, value):
        """Validate room number format"""
        if value and len(value.strip()) < 1:
            raise serializers.ValidationError(
                'Room number cannot be empty',
                code='invalid_room_number'
            )
        return value.strip() if value else value
    
    def validate(self, data):
        """Validate time slots and schedule conflicts"""
        start_time = data.get('start_time', self.instance.start_time if self.instance else None)
        end_time = data.get('end_time', self.instance.end_time if self.instance else None)
        
        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError({
                    'end_time': {
                        'message': 'End time must be after start time',
                        'code': 'invalid_time_range'
                    }
                })
            
            # Check minimum class duration (15 minutes)
            from datetime import datetime, timedelta
            duration = datetime.combine(datetime.today(), end_time) - datetime.combine(datetime.today(), start_time)
            if duration < timedelta(minutes=15):
                raise serializers.ValidationError({
                    'end_time': {
                        'message': 'Class duration must be at least 15 minutes',
                        'code': 'insufficient_duration'
                    }
                })
        
        # Check for schedule conflicts
        try:
            self._validate_schedule_conflicts(data, self.instance)
        except serializers.ValidationError as e:
            # Re-raise with enhanced error structure
            if 'schedule_conflicts' in e.detail:
                raise serializers.ValidationError({
                    'non_field_errors': {
                        'message': 'Schedule conflicts detected',
                        'code': 'schedule_conflict',
                        'conflicts': e.detail['schedule_conflicts']
                    }
                })
            raise
        
        return data


class BulkRoutineOperationSerializer(serializers.Serializer):
    """
    Serializer for bulk routine operations
    """
    OPERATION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
    ]
    
    operation = serializers.ChoiceField(choices=OPERATION_CHOICES)
    id = serializers.UUIDField(required=False, allow_null=True)
    data = serializers.DictField(required=False)
    
    def validate(self, attrs):
        """Validate operation data"""
        operation = attrs.get('operation')
        routine_id = attrs.get('id')
        data = attrs.get('data', {})
        
        if operation in ['update', 'delete'] and not routine_id:
            raise serializers.ValidationError({
                'id': 'ID is required for update and delete operations'
            })
        
        if operation in ['create', 'update'] and not data:
            raise serializers.ValidationError({
                'data': 'Data is required for create and update operations'
            })
        
        # Validate routine data for create/update operations
        if operation in ['create', 'update'] and data:
            if operation == 'create':
                serializer = ClassRoutineCreateSerializer(data=data)
            else:
                # For update, we'll validate against the existing instance
                try:
                    instance = ClassRoutine.objects.get(pk=routine_id)
                    serializer = ClassRoutineUpdateSerializer(instance, data=data, partial=True)
                except ClassRoutine.DoesNotExist:
                    raise serializers.ValidationError({
                        'id': 'Class routine not found'
                    })
            
            if not serializer.is_valid():
                raise serializers.ValidationError({
                    'data': serializer.errors
                })
        
        return attrs


class BulkRoutineRequestSerializer(serializers.Serializer):
    """
    Serializer for bulk routine update requests
    """
    operations = BulkRoutineOperationSerializer(many=True)
    
    def validate_operations(self, operations):
        """Validate operations list"""
        if not operations:
            raise serializers.ValidationError('At least one operation is required')
        
        if len(operations) > 100:
            raise serializers.ValidationError('Maximum 100 operations allowed per request')
        
        return operations
