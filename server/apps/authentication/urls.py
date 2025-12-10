"""
Authentication URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf_token_view, name='csrf-token'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('change-password/', views.change_password_view, name='change-password'),
    
    # Signup Request endpoints
    path('signup-request/', views.create_signup_request_view, name='create-signup-request'),
    path('signup-requests/', views.list_signup_requests_view, name='list-signup-requests'),
    path('signup-requests/<uuid:request_id>/', views.get_signup_request_view, name='get-signup-request'),
    path('signup-requests/<uuid:request_id>/approve/', views.approve_signup_request_view, name='approve-signup-request'),
    path('signup-requests/<uuid:request_id>/reject/', views.reject_signup_request_view, name='reject-signup-request'),
    path('signup-request-status/<str:username>/', views.check_signup_request_status_view, name='check-signup-request-status'),
]
