"""
Document Template Serializers
"""
from rest_framework import serializers
from .models import DocumentTemplate


class DocumentTemplateSerializer(serializers.ModelSerializer):
    """Full template serializer (admin CRUD)."""

    class Meta:
        model = DocumentTemplate
        fields = [
            'id', 'name', 'slug', 'category', 'description',
            'html_content', 'required_fields',
            'available_to_students', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer (lists / student-facing — no heavy html_content)."""

    class Meta:
        model = DocumentTemplate
        fields = [
            'id', 'name', 'slug', 'category', 'description',
            'required_fields', 'available_to_students', 'is_active',
        ]
