"""
Class Routine Serializers
"""
from rest_framework import serializers
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import ClassRoutine
from apps.departments.serializers import DepartmentSerializer
from apps.teachers.serializers import TeacherListSerializer


class ValidationErrorCodes:
    """Centralized error codes for consistent error handling"""
    # Field validation errors
    INVALID_SEMESTER = 'invalid_semester'
    INVALID_SHIFT = 'invalid_shift'
    INVALID_DAY = 'invalid_day'
    INVALID_SUBJECT_CODE = 'invalid_subject_code'
    INVALID_ROOM_NUMBER = 'invalid_room_number'
    INVALID_TIME_RANGE = 'invalid_time_range'
    INSUFFICIENT_DURATION = 'insufficient_duration'
    REQUIRED_FIELD = 'required_field'
    
    # Schedule conflict errors
    SCHEDULE_CONFLICT = 'schedule_conflict'
    ROOM_CONFLICT = 'room_conflict'
    TEACHER_CONFLICT = 'teacher_conflict'
    CLASS_CONFLICT = 'class_conflict'
    
    # Bulk operation errors
    BULK_OPERATION_INVALID = 'bulk_operation_invalid'
    BULK_LIMIT_EXCEEDED = 'bulk_limit_exceeded'
    ROUTINE_NOT_FOUND = 'routine_not_found'


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
            'class_type',
            'lab_name',
            'teacher',
            'room_number',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassRoutineCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating class routines with enhanced error handling
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
            'class_type',
            'lab_name',
            'teacher',
            'room_number',
            'is_active',
        ]
    
    def to_internal_value(self, data):
        """Override to provide better error messages for invalid data types"""
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as e:
            # Enhance error messages with more context
            enhanced_errors = {}
            for field, errors in e.detail.items():
                if isinstance(errors, list):
                    enhanced_errors[field] = []
                    for error in errors:
                        if isinstance(error, str):
                            enhanced_errors[field].append({
                                'message': error,
                                'code': 'invalid_value',
                                'field': field
                            })
                        else:
                            enhanced_errors[field].append(error)
                else:
                    enhanced_errors[field] = errors
            raise serializers.ValidationError(enhanced_errors)
    
    def _check_time_overlap(self, start_time1, end_time1, start_time2, end_time2):
        """Check if two time periods overlap"""
        return start_time1 < end_time2 and start_time2 < end_time1
    
    def _validate_schedule_conflicts(self, data, instance=None):
        """Validate that the schedule doesn't conflict with existing routines with enhanced error reporting"""
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
                        'code': ValidationErrorCodes.ROOM_CONFLICT,
                        'message': f'Room {room_number} is already booked on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'subject_code': routine.subject_code,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number,
                            'department': routine.department.name if routine.department else 'Unknown',
                            'semester': routine.semester,
                            'shift': routine.shift,
                            'teacher': routine.teacher.name if routine.teacher else None
                        },
                        'suggestion': 'Consider using a different room or time slot',
                        'alternative_actions': [
                            'Change room number',
                            'Modify time slot',
                            'Reschedule to different day'
                        ],
                        'conflict_details': {
                            'requested_time': f'{start_time} - {end_time}',
                            'conflicting_time': f'{routine.start_time} - {routine.end_time}',
                            'overlap_duration': self._calculate_overlap_duration(start_time, end_time, routine.start_time, routine.end_time)
                        }
                    })
                
                # Check teacher conflict
                if teacher and routine.teacher_id == teacher.id:
                    conflicts.append({
                        'type': 'teacher_conflict',
                        'code': ValidationErrorCodes.TEACHER_CONFLICT,
                        'message': f'Teacher {teacher.name if hasattr(teacher, "name") else teacher} is already assigned on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'subject_code': routine.subject_code,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number,
                            'department': routine.department.name if routine.department else 'Unknown',
                            'semester': routine.semester,
                            'shift': routine.shift,
                            'teacher': routine.teacher.name if routine.teacher else 'Unknown'
                        },
                        'suggestion': 'Consider assigning a different teacher or time slot',
                        'alternative_actions': [
                            'Assign different teacher',
                            'Modify time slot',
                            'Reschedule to different day'
                        ],
                        'conflict_details': {
                            'requested_time': f'{start_time} - {end_time}',
                            'conflicting_time': f'{routine.start_time} - {routine.end_time}',
                            'teacher_id': str(teacher.id) if hasattr(teacher, 'id') else None,
                            'overlap_duration': self._calculate_overlap_duration(start_time, end_time, routine.start_time, routine.end_time)
                        }
                    })
                
                # Check class conflict (same department, semester, shift)
                if (department and semester and shift and 
                    routine.department_id == department.id and 
                    routine.semester == semester and 
                    routine.shift == shift):
                    conflicts.append({
                        'type': 'class_conflict',
                        'code': ValidationErrorCodes.CLASS_CONFLICT,
                        'message': f'Students of {department.name} Semester {semester} ({shift}) already have {routine.subject_name} on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'subject_code': routine.subject_code,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number,
                            'department': routine.department.name,
                            'semester': routine.semester,
                            'shift': routine.shift,
                            'teacher': routine.teacher.name if routine.teacher else None
                        },
                        'suggestion': 'Consider scheduling at a different time',
                        'alternative_actions': [
                            'Modify time slot',
                            'Reschedule to different day',
                            'Change to different shift'
                        ],
                        'conflict_details': {
                            'requested_time': f'{start_time} - {end_time}',
                            'conflicting_time': f'{routine.start_time} - {routine.end_time}',
                            'class_identifier': f'{department.name} Semester {semester} ({shift})',
                            'overlap_duration': self._calculate_overlap_duration(start_time, end_time, routine.start_time, routine.end_time)
                        }
                    })
        
        if conflicts:
            raise serializers.ValidationError({
                'schedule_conflicts': conflicts
            })
    
    def _calculate_overlap_duration(self, start1, end1, start2, end2):
        """Calculate the duration of overlap between two time periods"""
        try:
            from datetime import datetime, timedelta
            
            # Convert times to datetime objects for calculation
            base_date = datetime.today().date()
            dt1_start = datetime.combine(base_date, start1)
            dt1_end = datetime.combine(base_date, end1)
            dt2_start = datetime.combine(base_date, start2)
            dt2_end = datetime.combine(base_date, end2)
            
            # Calculate overlap
            overlap_start = max(dt1_start, dt2_start)
            overlap_end = min(dt1_end, dt2_end)
            
            if overlap_start < overlap_end:
                overlap_duration = overlap_end - overlap_start
                return int(overlap_duration.total_seconds() / 60)  # Return minutes
            
            return 0
        except Exception:
            return 0
    
    def validate_semester(self, value):
        """Validate semester is within valid range with enhanced error messages"""
        if value is None:
            raise serializers.ValidationError({
                'message': 'Semester is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'semester'
            })
        
        if not isinstance(value, int):
            raise serializers.ValidationError({
                'message': 'Semester must be a number',
                'code': ValidationErrorCodes.INVALID_SEMESTER,
                'field': 'semester',
                'provided_value': str(value),
                'expected_type': 'integer'
            })
        
        if not (1 <= value <= 8):
            raise serializers.ValidationError({
                'message': 'Semester must be between 1 and 8',
                'code': ValidationErrorCodes.INVALID_SEMESTER,
                'field': 'semester',
                'provided_value': value,
                'valid_range': '1-8'
            })
        return value
    
    def validate_shift(self, value):
        """Validate shift is a valid choice with enhanced error messages"""
        if not value:
            raise serializers.ValidationError({
                'message': 'Shift is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'shift'
            })
        
        valid_shifts = ['Morning', 'Day', 'Evening']
        if value not in valid_shifts:
            raise serializers.ValidationError({
                'message': f'Shift must be one of: {", ".join(valid_shifts)}',
                'code': ValidationErrorCodes.INVALID_SHIFT,
                'field': 'shift',
                'provided_value': value,
                'valid_choices': valid_shifts
            })
        return value
    
    def validate_day_of_week(self, value):
        """Validate day of week is a valid choice with enhanced error messages"""
        if not value:
            raise serializers.ValidationError({
                'message': 'Day of week is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'day_of_week'
            })
        
        valid_days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
        if value not in valid_days:
            raise serializers.ValidationError({
                'message': f'Day must be one of: {", ".join(valid_days)}',
                'code': ValidationErrorCodes.INVALID_DAY,
                'field': 'day_of_week',
                'provided_value': value,
                'valid_choices': valid_days
            })
        return value
    
    def validate_subject_name(self, value):
        """Validate subject name with enhanced error messages"""
        if not value or not value.strip():
            raise serializers.ValidationError({
                'message': 'Subject name is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'subject_name'
            })
        
        if len(value.strip()) < 2:
            raise serializers.ValidationError({
                'message': 'Subject name must be at least 2 characters long',
                'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                'field': 'subject_name',
                'provided_length': len(value.strip()),
                'minimum_length': 2
            })
        
        return value.strip()
    
    def validate_subject_code(self, value):
        """Validate subject code format with enhanced error messages"""
        if not value or not value.strip():
            raise serializers.ValidationError({
                'message': 'Subject code is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'subject_code'
            })
        
        cleaned_value = value.strip()
        if len(cleaned_value) < 2:
            raise serializers.ValidationError({
                'message': 'Subject code must be at least 2 characters long',
                'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                'field': 'subject_code',
                'provided_value': cleaned_value,
                'provided_length': len(cleaned_value),
                'minimum_length': 2
            })
        
        # Check for valid format (letters and numbers only)
        if not cleaned_value.replace(' ', '').isalnum():
            raise serializers.ValidationError({
                'message': 'Subject code can only contain letters, numbers, and spaces',
                'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                'field': 'subject_code',
                'provided_value': cleaned_value
            })
        
        return cleaned_value.upper()
    
    def validate_room_number(self, value):
        """Validate room number format with enhanced error messages"""
        if not value or not value.strip():
            raise serializers.ValidationError({
                'message': 'Room number is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'room_number'
            })
        
        cleaned_value = value.strip()
        if len(cleaned_value) < 1:
            raise serializers.ValidationError({
                'message': 'Room number cannot be empty',
                'code': ValidationErrorCodes.INVALID_ROOM_NUMBER,
                'field': 'room_number'
            })
        
        return cleaned_value
    
    def validate_session(self, value):
        """Validate session format with enhanced error messages"""
        if not value or not value.strip():
            raise serializers.ValidationError({
                'message': 'Session is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'session'
            })
        
        return value.strip()
    
    def validate_start_time(self, value):
        """Validate start time with enhanced error messages"""
        if not value:
            raise serializers.ValidationError({
                'message': 'Start time is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'start_time'
            })
        return value
    
    def validate_end_time(self, value):
        """Validate end time with enhanced error messages"""
        if not value:
            raise serializers.ValidationError({
                'message': 'End time is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'end_time'
            })
        return value
    
    def validate(self, data):
        """Validate time slots and schedule conflicts with enhanced error handling"""
        errors = {}
        
        # Validate time relationship
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time:
            if end_time <= start_time:
                errors['end_time'] = {
                    'message': 'End time must be after start time',
                    'code': ValidationErrorCodes.INVALID_TIME_RANGE,
                    'field': 'end_time',
                    'start_time': str(start_time),
                    'end_time': str(end_time)
                }
            else:
                # Check minimum class duration (15 minutes)
                from datetime import datetime, timedelta
                try:
                    duration = datetime.combine(datetime.today(), end_time) - datetime.combine(datetime.today(), start_time)
                    if duration < timedelta(minutes=15):
                        errors['end_time'] = {
                            'message': 'Class duration must be at least 15 minutes',
                            'code': ValidationErrorCodes.INSUFFICIENT_DURATION,
                            'field': 'end_time',
                            'duration_minutes': int(duration.total_seconds() / 60),
                            'minimum_duration_minutes': 15
                    }
                except (TypeError, ValueError) as e:
                    errors['time_validation'] = {
                        'message': 'Invalid time format provided',
                        'code': ValidationErrorCodes.INVALID_TIME_RANGE,
                        'error_details': str(e)
                    }

        # Validate class type and lab name
        class_type = data.get('class_type', 'Theory')
        lab_name = data.get('lab_name')
        valid_types = ['Theory', 'Lab']
        if class_type not in valid_types:
            errors['class_type'] = {
                'message': f'Class type must be one of: {", ".join(valid_types)}',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'class_type',
                'provided_value': class_type
            }
        if class_type == 'Lab' and not (lab_name and str(lab_name).strip()):
            errors['lab_name'] = {
                'message': 'Lab name is required for Lab classes',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'lab_name'
            }
        
        # Validate required relationships
        department = data.get('department')
        if not department:
            errors['department'] = {
                'message': 'Department is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'department'
            }
        
        # Check for schedule conflicts only if basic validation passes
        if not errors:
            try:
                self._validate_schedule_conflicts(data)
            except serializers.ValidationError as e:
                # Re-raise with enhanced error structure
                if 'schedule_conflicts' in e.detail:
                    errors['schedule_conflicts'] = {
                        'message': 'Schedule conflicts detected',
                        'code': ValidationErrorCodes.SCHEDULE_CONFLICT,
                        'conflicts': e.detail['schedule_conflicts'],
                        'conflict_count': len(e.detail['schedule_conflicts'])
                    }
                else:
                    # Handle other validation errors
                    errors.update(e.detail)
            except Exception as e:
                errors['validation_error'] = {
                    'message': 'An error occurred during validation',
                    'code': 'validation_error',
                    'error_details': str(e)
                }
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data


class ClassRoutineUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating class routines with enhanced error handling
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
            'class_type',
            'lab_name',
            'teacher',
            'room_number',
            'is_active',
        ]
    
    def to_internal_value(self, data):
        """Override to provide better error messages for invalid data types"""
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as e:
            # Enhance error messages with more context
            enhanced_errors = {}
            for field, errors in e.detail.items():
                if isinstance(errors, list):
                    enhanced_errors[field] = []
                    for error in errors:
                        if isinstance(error, str):
                            enhanced_errors[field].append({
                                'message': error,
                                'code': 'invalid_value',
                                'field': field,
                                'operation': 'update'
                            })
                        else:
                            enhanced_errors[field].append(error)
                else:
                    enhanced_errors[field] = errors
            raise serializers.ValidationError(enhanced_errors)
    
    def _check_time_overlap(self, start_time1, end_time1, start_time2, end_time2):
        """Check if two time periods overlap"""
        return start_time1 < end_time2 and start_time2 < end_time1
    
    def _validate_schedule_conflicts(self, data, instance):
        """Validate that the schedule doesn't conflict with existing routines with enhanced error reporting"""
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
                        'code': ValidationErrorCodes.ROOM_CONFLICT,
                        'message': f'Room {room_number} is already booked on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'subject_code': routine.subject_code,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number,
                            'department': routine.department.name if routine.department else 'Unknown',
                            'semester': routine.semester,
                            'shift': routine.shift,
                            'teacher': routine.teacher.name if routine.teacher else None
                        },
                        'suggestion': 'Consider using a different room or time slot',
                        'alternative_actions': [
                            'Change room number',
                            'Modify time slot',
                            'Reschedule to different day'
                        ],
                        'conflict_details': {
                            'requested_time': f'{start_time} - {end_time}',
                            'conflicting_time': f'{routine.start_time} - {routine.end_time}',
                            'overlap_duration': self._calculate_overlap_duration(start_time, end_time, routine.start_time, routine.end_time),
                            'operation': 'update',
                            'updating_routine_id': str(instance.id)
                        }
                    })
                
                # Check teacher conflict
                if teacher and routine.teacher_id == teacher.id:
                    conflicts.append({
                        'type': 'teacher_conflict',
                        'code': ValidationErrorCodes.TEACHER_CONFLICT,
                        'message': f'Teacher {teacher.name if hasattr(teacher, "name") else teacher} is already assigned on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'subject_code': routine.subject_code,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number,
                            'department': routine.department.name if routine.department else 'Unknown',
                            'semester': routine.semester,
                            'shift': routine.shift,
                            'teacher': routine.teacher.name if routine.teacher else 'Unknown'
                        },
                        'suggestion': 'Consider assigning a different teacher or time slot',
                        'alternative_actions': [
                            'Assign different teacher',
                            'Modify time slot',
                            'Reschedule to different day'
                        ],
                        'conflict_details': {
                            'requested_time': f'{start_time} - {end_time}',
                            'conflicting_time': f'{routine.start_time} - {routine.end_time}',
                            'teacher_id': str(teacher.id) if hasattr(teacher, 'id') else None,
                            'overlap_duration': self._calculate_overlap_duration(start_time, end_time, routine.start_time, routine.end_time),
                            'operation': 'update',
                            'updating_routine_id': str(instance.id)
                        }
                    })
                
                # Check class conflict (same department, semester, shift)
                if (department and semester and shift and 
                    routine.department_id == department.id and 
                    routine.semester == semester and 
                    routine.shift == shift):
                    conflicts.append({
                        'type': 'class_conflict',
                        'code': ValidationErrorCodes.CLASS_CONFLICT,
                        'message': f'Students of {department.name} Semester {semester} ({shift}) already have {routine.subject_name} on {day_of_week} from {routine.start_time} to {routine.end_time}',
                        'conflicting_routine': {
                            'id': str(routine.id),
                            'subject': routine.subject_name,
                            'subject_code': routine.subject_code,
                            'time': f'{routine.start_time} - {routine.end_time}',
                            'room': routine.room_number,
                            'department': routine.department.name,
                            'semester': routine.semester,
                            'shift': routine.shift,
                            'teacher': routine.teacher.name if routine.teacher else None
                        },
                        'suggestion': 'Consider scheduling at a different time',
                        'alternative_actions': [
                            'Modify time slot',
                            'Reschedule to different day',
                            'Change to different shift'
                        ],
                        'conflict_details': {
                            'requested_time': f'{start_time} - {end_time}',
                            'conflicting_time': f'{routine.start_time} - {routine.end_time}',
                            'class_identifier': f'{department.name} Semester {semester} ({shift})',
                            'overlap_duration': self._calculate_overlap_duration(start_time, end_time, routine.start_time, routine.end_time),
                            'operation': 'update',
                            'updating_routine_id': str(instance.id)
                        }
                    })
        
        if conflicts:
            raise serializers.ValidationError({
                'schedule_conflicts': conflicts
            })
    
    def _calculate_overlap_duration(self, start1, end1, start2, end2):
        """Calculate the duration of overlap between two time periods"""
        try:
            from datetime import datetime, timedelta
            
            # Convert times to datetime objects for calculation
            base_date = datetime.today().date()
            dt1_start = datetime.combine(base_date, start1)
            dt1_end = datetime.combine(base_date, end1)
            dt2_start = datetime.combine(base_date, start2)
            dt2_end = datetime.combine(base_date, end2)
            
            # Calculate overlap
            overlap_start = max(dt1_start, dt2_start)
            overlap_end = min(dt1_end, dt2_end)
            
            if overlap_start < overlap_end:
                overlap_duration = overlap_end - overlap_start
                return int(overlap_duration.total_seconds() / 60)  # Return minutes
            
            return 0
        except Exception:
            return 0
    
    def validate_semester(self, value):
        """Validate semester is within valid range with enhanced error messages"""
        if value is not None:
            if not isinstance(value, int):
                raise serializers.ValidationError({
                    'message': 'Semester must be a number',
                    'code': ValidationErrorCodes.INVALID_SEMESTER,
                    'field': 'semester',
                    'provided_value': str(value),
                    'expected_type': 'integer'
                })
            
            if not (1 <= value <= 8):
                raise serializers.ValidationError({
                    'message': 'Semester must be between 1 and 8',
                    'code': ValidationErrorCodes.INVALID_SEMESTER,
                    'field': 'semester',
                    'provided_value': value,
                    'valid_range': '1-8'
                })
        return value
    
    def validate_shift(self, value):
        """Validate shift is a valid choice with enhanced error messages"""
        if value is not None:
            valid_shifts = ['Morning', 'Day', 'Evening']
            if value not in valid_shifts:
                raise serializers.ValidationError({
                    'message': f'Shift must be one of: {", ".join(valid_shifts)}',
                    'code': ValidationErrorCodes.INVALID_SHIFT,
                    'field': 'shift',
                    'provided_value': value,
                    'valid_choices': valid_shifts
                })
        return value
    
    def validate_day_of_week(self, value):
        """Validate day of week is a valid choice with enhanced error messages"""
        if value is not None:
            valid_days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
            if value not in valid_days:
                raise serializers.ValidationError({
                    'message': f'Day must be one of: {", ".join(valid_days)}',
                    'code': ValidationErrorCodes.INVALID_DAY,
                    'field': 'day_of_week',
                    'provided_value': value,
                    'valid_choices': valid_days
                })
        return value
    
    def validate_subject_name(self, value):
        """Validate subject name with enhanced error messages"""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError({
                    'message': 'Subject name cannot be empty',
                    'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                    'field': 'subject_name'
                })
            
            if len(value.strip()) < 2:
                raise serializers.ValidationError({
                    'message': 'Subject name must be at least 2 characters long',
                    'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                    'field': 'subject_name',
                    'provided_length': len(value.strip()),
                    'minimum_length': 2
                })
            
            return value.strip()
        return value
    
    def validate_subject_code(self, value):
        """Validate subject code format with enhanced error messages"""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError({
                    'message': 'Subject code cannot be empty',
                    'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                    'field': 'subject_code'
                })
            
            cleaned_value = value.strip()
            if len(cleaned_value) < 2:
                raise serializers.ValidationError({
                    'message': 'Subject code must be at least 2 characters long',
                    'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                    'field': 'subject_code',
                    'provided_value': cleaned_value,
                    'provided_length': len(cleaned_value),
                    'minimum_length': 2
                })
            
            # Check for valid format (letters and numbers only)
            if not cleaned_value.replace(' ', '').isalnum():
                raise serializers.ValidationError({
                    'message': 'Subject code can only contain letters, numbers, and spaces',
                    'code': ValidationErrorCodes.INVALID_SUBJECT_CODE,
                    'field': 'subject_code',
                    'provided_value': cleaned_value
                })
            
            return cleaned_value.upper()
        return value
    
    def validate_room_number(self, value):
        """Validate room number format with enhanced error messages"""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError({
                    'message': 'Room number cannot be empty',
                    'code': ValidationErrorCodes.INVALID_ROOM_NUMBER,
                    'field': 'room_number'
                })
            return value.strip()
        return value
    
    def validate_session(self, value):
        """Validate session format with enhanced error messages"""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError({
                    'message': 'Session cannot be empty',
                    'code': ValidationErrorCodes.REQUIRED_FIELD,
                    'field': 'session'
                })
            return value.strip()
        return value
    
    def validate(self, data):
        """Validate time slots and schedule conflicts with enhanced error handling"""
        errors = {}
        
        # Get current and new values for validation
        start_time = data.get('start_time', self.instance.start_time if self.instance else None)
        end_time = data.get('end_time', self.instance.end_time if self.instance else None)
        
        if start_time and end_time:
            if end_time <= start_time:
                errors['end_time'] = {
                    'message': 'End time must be after start time',
                    'code': ValidationErrorCodes.INVALID_TIME_RANGE,
                    'field': 'end_time',
                    'start_time': str(start_time),
                    'end_time': str(end_time),
                    'operation': 'update'
                }
            else:
                # Check minimum class duration (15 minutes)
                from datetime import datetime, timedelta
                try:
                    duration = datetime.combine(datetime.today(), end_time) - datetime.combine(datetime.today(), start_time)
                    if duration < timedelta(minutes=15):
                        errors['end_time'] = {
                            'message': 'Class duration must be at least 15 minutes',
                            'code': ValidationErrorCodes.INSUFFICIENT_DURATION,
                            'field': 'end_time',
                            'duration_minutes': int(duration.total_seconds() / 60),
                            'minimum_duration_minutes': 15,
                            'operation': 'update'
                    }
                except (TypeError, ValueError) as e:
                    errors['time_validation'] = {
                        'message': 'Invalid time format provided',
                        'code': ValidationErrorCodes.INVALID_TIME_RANGE,
                        'error_details': str(e),
                        'operation': 'update'
                    }

        # Validate class type and lab name
        class_type = data.get('class_type', self.instance.class_type if self.instance else 'Theory')
        lab_name = data.get('lab_name', self.instance.lab_name if self.instance else None)
        valid_types = ['Theory', 'Lab']
        if class_type not in valid_types:
            errors['class_type'] = {
                'message': f'Class type must be one of: {", ".join(valid_types)}',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'class_type',
                'provided_value': class_type,
                'operation': 'update'
            }
        if class_type == 'Lab' and not (lab_name and str(lab_name).strip()):
            errors['lab_name'] = {
                'message': 'Lab name is required for Lab classes',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'lab_name',
                'operation': 'update'
            }
        
        # Check for schedule conflicts only if basic validation passes
        if not errors and self.instance:
            try:
                self._validate_schedule_conflicts(data, self.instance)
            except serializers.ValidationError as e:
                # Re-raise with enhanced error structure
                if 'schedule_conflicts' in e.detail:
                    errors['schedule_conflicts'] = {
                        'message': 'Schedule conflicts detected during update',
                        'code': ValidationErrorCodes.SCHEDULE_CONFLICT,
                        'conflicts': e.detail['schedule_conflicts'],
                        'conflict_count': len(e.detail['schedule_conflicts']),
                        'operation': 'update',
                        'routine_id': str(self.instance.id) if self.instance else None
                    }
                else:
                    # Handle other validation errors
                    errors.update(e.detail)
            except Exception as e:
                errors['validation_error'] = {
                    'message': 'An error occurred during update validation',
                    'code': 'validation_error',
                    'error_details': str(e),
                    'operation': 'update'
                }
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data


class BulkRoutineOperationSerializer(serializers.Serializer):
    """
    Serializer for bulk routine operations with enhanced error handling
    """
    OPERATION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
    ]
    
    operation = serializers.ChoiceField(choices=OPERATION_CHOICES)
    id = serializers.UUIDField(required=False, allow_null=True)
    data = serializers.DictField(required=False)
    
    def validate_operation(self, value):
        """Validate operation type with enhanced error messages"""
        if not value:
            raise serializers.ValidationError({
                'message': 'Operation is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'operation',
                'valid_choices': [choice[0] for choice in self.OPERATION_CHOICES]
            })
        return value
    
    def validate_id(self, value):
        """Validate UUID format with enhanced error messages"""
        if value is not None:
            try:
                # UUID validation is handled by UUIDField, but we can add custom checks
                if str(value) == '00000000-0000-0000-0000-000000000000':
                    raise serializers.ValidationError({
                        'message': 'Invalid UUID: null UUID not allowed',
                        'code': ValidationErrorCodes.ROUTINE_NOT_FOUND,
                        'field': 'id',
                        'provided_value': str(value)
                    })
            except (ValueError, TypeError):
                raise serializers.ValidationError({
                    'message': 'Invalid UUID format',
                    'code': ValidationErrorCodes.ROUTINE_NOT_FOUND,
                    'field': 'id',
                    'provided_value': str(value)
                })
        return value
    
    def validate(self, attrs):
        """Validate operation data with comprehensive error handling"""
        operation = attrs.get('operation')
        routine_id = attrs.get('id')
        data = attrs.get('data', {})
        errors = {}
        
        # Validate operation-specific requirements
        if operation in ['update', 'delete'] and not routine_id:
            errors['id'] = {
                'message': f'ID is required for {operation} operations',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'id',
                'operation': operation
            }
        
        if operation in ['create', 'update'] and not data:
            errors['data'] = {
                'message': f'Data is required for {operation} operations',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'data',
                'operation': operation
            }
        
        # Early return if basic validation fails
        if errors:
            raise serializers.ValidationError(errors)
        
        # Validate routine data for create/update operations
        if operation in ['create', 'update'] and data:
            try:
                if operation == 'create':
                    serializer = ClassRoutineCreateSerializer(data=data)
                else:
                    # For update, validate against the existing instance
                    try:
                        instance = ClassRoutine.objects.get(pk=routine_id)
                        serializer = ClassRoutineUpdateSerializer(instance, data=data, partial=True)
                    except ClassRoutine.DoesNotExist:
                        errors['id'] = {
                            'message': 'Class routine not found',
                            'code': ValidationErrorCodes.ROUTINE_NOT_FOUND,
                            'field': 'id',
                            'provided_id': str(routine_id),
                            'operation': operation
                        }
                        raise serializers.ValidationError(errors)
                
                if not serializer.is_valid():
                    # Enhance nested validation errors
                    enhanced_data_errors = {}
                    for field, field_errors in serializer.errors.items():
                        enhanced_data_errors[field] = {
                            'errors': field_errors,
                            'operation': operation,
                            'field': field
                        }
                    
                    errors['data'] = {
                        'message': f'Validation failed for {operation} operation',
                        'code': ValidationErrorCodes.BULK_OPERATION_INVALID,
                        'operation': operation,
                        'field_errors': enhanced_data_errors
                    }
                    
            except Exception as e:
                errors['validation_error'] = {
                    'message': f'Unexpected error during {operation} validation',
                    'code': 'validation_error',
                    'operation': operation,
                    'error_details': str(e)
                }
        
        # Validate delete operation
        elif operation == 'delete' and routine_id:
            try:
                if not ClassRoutine.objects.filter(pk=routine_id).exists():
                    errors['id'] = {
                        'message': 'Class routine not found for deletion',
                        'code': ValidationErrorCodes.ROUTINE_NOT_FOUND,
                        'field': 'id',
                        'provided_id': str(routine_id),
                        'operation': operation
                    }
            except Exception as e:
                errors['validation_error'] = {
                    'message': 'Error validating routine for deletion',
                    'code': 'validation_error',
                    'operation': operation,
                    'error_details': str(e)
                }
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return attrs


class BulkRoutineRequestSerializer(serializers.Serializer):
    """
    Serializer for bulk routine update requests with enhanced error handling
    """
    operations = BulkRoutineOperationSerializer(many=True)
    
    def validate_operations(self, operations):
        """Validate operations list with comprehensive error handling"""
        if not operations:
            raise serializers.ValidationError({
                'message': 'At least one operation is required',
                'code': ValidationErrorCodes.REQUIRED_FIELD,
                'field': 'operations',
                'provided_count': 0,
                'minimum_count': 1
            })
        
        if len(operations) > 100:
            raise serializers.ValidationError({
                'message': 'Maximum 100 operations allowed per request',
                'code': ValidationErrorCodes.BULK_LIMIT_EXCEEDED,
                'field': 'operations',
                'provided_count': len(operations),
                'maximum_count': 100
            })
        
        # Validate for duplicate IDs in update/delete operations
        operation_ids = []
        for i, operation in enumerate(operations):
            if operation.get('operation') in ['update', 'delete'] and operation.get('id'):
                op_id = str(operation['id'])
                if op_id in operation_ids:
                    raise serializers.ValidationError({
                        'message': f'Duplicate routine ID found in operations',
                        'code': ValidationErrorCodes.BULK_OPERATION_INVALID,
                        'field': 'operations',
                        'duplicate_id': op_id,
                        'operation_index': i
                    })
                operation_ids.append(op_id)
        
        return operations
    
    def validate(self, attrs):
        """Additional validation for the entire bulk request"""
        operations = attrs.get('operations', [])
        
        # Count operations by type for validation
        operation_counts = {'create': 0, 'update': 0, 'delete': 0}
        for operation in operations:
            op_type = operation.get('operation')
            if op_type in operation_counts:
                operation_counts[op_type] += 1
        
        # Add operation summary to validated data for logging/monitoring
        attrs['operation_summary'] = {
            'total_operations': len(operations),
            'create_count': operation_counts['create'],
            'update_count': operation_counts['update'],
            'delete_count': operation_counts['delete']
        }
        
        return attrs
