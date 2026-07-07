"""
Department Serializers
"""
from rest_framework import serializers
from .models import Department


def _serialize_heads(obj, context=None):
    """
    The real Department Head accounts assigned to this department (via the
    User.department FK, related_name='heads'), newest account first — used by
    the admin UI to show who actually runs the department (the legacy plain
    text `head` field is kept only for backward compatibility).

    Only returned to AUTHENTICATED users: this exposes staff account IDs/names,
    and the department LIST endpoint is public (registration/admission
    dropdowns), so anonymous callers get an empty list.

    Reads from the prefetched `heads` relation (see the viewset's
    `prefetch_related('heads')`) and filters/sorts in Python to avoid an
    extra query per department.
    """
    request = context.get('request') if context else None
    if not (request and getattr(request, 'user', None) and request.user.is_authenticated):
        return []
    try:
        heads = [h for h in obj.heads.all() if h.role == 'department_head']
        heads.sort(key=lambda h: h.date_joined, reverse=True)
        return [
            {
                'id': str(h.id),
                'name': (f"{h.first_name} {h.last_name}".strip() or h.username),
                'shift': h.shift or '',
            }
            for h in heads
        ]
    except Exception:
        return []


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department model
    """
    # Accept both 'code' and 'short_name' for backwards compatibility
    short_name = serializers.CharField(source='code', required=False, allow_blank=True)
    total_students = serializers.SerializerMethodField()
    active_students = serializers.SerializerMethodField()
    faculty_count = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    heads = serializers.SerializerMethodField()
    
    # Provide both camelCase and snake_case for timestamps
    created_at = serializers.DateTimeField(source='createdAt', read_only=True)
    updated_at = serializers.DateTimeField(source='updatedAt', read_only=True)
    
    def get_total_students(self, obj):
        """Get total student count for department"""
        try:
            return obj.student_count()
        except Exception:
            return 0
    
    def get_active_students(self, obj):
        """Get active student count for department"""
        try:
            return obj.student_set.filter(status='active').count()
        except Exception:
            return 0
    
    def get_faculty_count(self, obj):
        """Get teacher count for department"""
        try:
            return obj.teacher_count()
        except Exception:
            return 0
    
    def get_photo_url(self, obj):
        """Get photo URL if exists"""
        if not obj.photo:
            return None
        try:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        except Exception:
            return None

    def get_heads(self, obj):
        return _serialize_heads(obj, self.context)

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'short_name', 'head', 'heads',
            'established_year', 'photo', 'photo_url', 'autoAttendanceSync',
            'total_students', 'active_students',
            'faculty_count', 'created_at', 'updated_at', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
                           'total_students', 'active_students', 'faculty_count', 'photo_url', 'heads']
        extra_kwargs = {
            'code': {'required': False},  # Make code optional since we accept short_name too
            'photo': {'required': False}
        }

    def validate_name(self, value):
        """Validate department name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Department name cannot be empty")
        return value.strip()

    def validate(self, attrs):
        """Clean and validate attributes"""
        # If short_name is provided (via source='code'), it's already in attrs['code']
        # If code is provided directly, it's also in attrs['code']
        
        # For updates, code might not be in attrs if it wasn't changed
        if 'code' in attrs:
            if not attrs['code'] or not attrs['code'].strip():
                raise serializers.ValidationError({
                    'code': 'Code/short_name cannot be empty'
                })
            # Ensure code is uppercase
            attrs['code'] = attrs['code'].strip().upper()
        elif not self.instance:
            # For create operations, code is required
            raise serializers.ValidationError({
                'code': 'Code or short_name is required'
            })
        
        # Convert empty strings to None for optional fields
        if 'head' in attrs and not attrs['head']:
            attrs['head'] = None
        if 'established_year' in attrs and not attrs['established_year']:
            attrs['established_year'] = None
        
        return attrs


class DepartmentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing departments
    """
    short_name = serializers.CharField(source='code', read_only=True)
    total_students = serializers.SerializerMethodField()
    active_students = serializers.SerializerMethodField()
    faculty_count = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    heads = serializers.SerializerMethodField()

    def get_heads(self, obj):
        return _serialize_heads(obj, self.context)

    def get_total_students(self, obj):
        """Get total student count for department"""
        try:
            return obj.student_count()
        except Exception:
            return 0
    
    def get_active_students(self, obj):
        """Get active student count for department"""
        try:
            return obj.student_set.filter(status='active').count()
        except Exception:
            return 0
    
    def get_faculty_count(self, obj):
        """Get teacher count for department"""
        try:
            return obj.teacher_count()
        except Exception:
            return 0
    
    def get_photo_url(self, obj):
        """Get photo URL if exists"""
        if not obj.photo:
            return None
        try:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        except Exception:
            return None
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'short_name', 'head', 'heads',
            'established_year', 'photo_url', 'autoAttendanceSync',
            'total_students', 'active_students', 'faculty_count'
        ]
