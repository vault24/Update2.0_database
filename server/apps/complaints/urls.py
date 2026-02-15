"""
Complaints URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.ComplaintCategoryViewSet, basename='complaintcategory')
router.register(r'subcategories', views.ComplaintSubcategoryViewSet, basename='complaintsubcategory')
router.register(r'complaints', views.ComplaintViewSet, basename='complaint')
router.register(r'dashboard', views.DashboardViewSet, basename='complaints-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
