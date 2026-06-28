"""
Document Template Views

Admin-managed certificate templates. Students may only read the published
catalog (`available/`); all create/update/delete operations require an admin role.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from apps.authentication.permissions import IsAdminRole
from .models import DocumentTemplate
from .template_serializers import (
    DocumentTemplateSerializer,
    DocumentTemplateListSerializer,
)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for document templates (admin only) plus a public `available/` list.

    Endpoints:
    - GET    /api/document-templates/            list all (admin)
    - POST   /api/document-templates/            create (admin)
    - GET    /api/document-templates/{id}/       retrieve (admin)
    - PATCH  /api/document-templates/{id}/       update (admin)
    - DELETE /api/document-templates/{id}/       delete (admin)
    - GET    /api/document-templates/available/  published templates (students)
    """
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'available_to_students', 'is_active']

    def get_permissions(self):
        if self.action == 'available':
            return [AllowAny()]
        return [IsAdminRole()]

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def available(self, request):
        """Templates a student is allowed to apply for."""
        templates = DocumentTemplate.objects.filter(
            available_to_students=True, is_active=True
        ).order_by('name')
        serializer = DocumentTemplateListSerializer(templates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
