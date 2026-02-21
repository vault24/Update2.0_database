"""
System Settings Views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import SystemSettings
from .serializers import SystemSettingsSerializer, SystemSettingsUpdateSerializer


class SystemSettingsView(APIView):
    """
    View for system settings
    
    GET /api/settings/ - Get current settings (public)
    PUT /api/settings/ - Update settings (authenticated only)
    """
    
    def get_permissions(self):
        """
        Allow anyone to read settings, but only authenticated users to update
        """
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get(self, request):
        """Get current system settings"""
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Update system settings"""
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsUpdateSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(
                SystemSettingsSerializer(settings).data,
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
