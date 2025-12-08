from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MarksViewSet

router = DefaultRouter()
router.register(r'', MarksViewSet, basename='marks')

urlpatterns = [path('', include(router.urls))]
