"""
Authentication URLs
"""
from django.urls import path
from . import views
from . import password_reset_views

urlpatterns = [
    path('csrf/', views.csrf_token_view, name='csrf-token'),
    path('register/send-otp/', views.register_request_otp_view, name='register-send-otp'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('profile/', views.update_profile_view, name='update-profile'),
    path('profile/photo/', views.upload_avatar_view, name='upload-avatar'),
    path('profile/signature/', views.upload_signature_view, name='upload-signature'),
    path('2fa/toggle/', views.toggle_2fa_view, name='toggle-2fa'),
    path('sessions/revoke-others/', views.revoke_other_sessions_view, name='revoke-other-sessions'),
    path('login/verify-2fa/', views.verify_login_2fa_view, name='verify-login-2fa'),

    # Account switching / deletion (OTP-verified)
    path('account/send-otp/', views.account_send_otp_view, name='account-send-otp'),
    path('account/switch/', views.switch_account_view, name='account-switch'),
    path('account/delete/', views.delete_account_view, name='account-delete'),

    # Captain account requests (reviewed by Department Heads)
    path('captain-requests/', views.list_captain_requests_view, name='list-captain-requests'),
    path('captain-requests/<uuid:request_id>/review/', views.review_captain_request_view, name='review-captain-request'),
    
    # Signup Request endpoints
    path('signup-request/availability/', views.check_signup_availability_view, name='signup-request-availability'),
    path('signup-request/send-code/', views.send_signup_request_code_view, name='signup-request-send-code'),
    path('signup-request/', views.create_signup_request_view, name='create-signup-request'),
    path('signup-requests/', views.list_signup_requests_view, name='list-signup-requests'),
    path('signup-requests/<uuid:request_id>/', views.get_signup_request_view, name='get-signup-request'),
    path('signup-requests/<uuid:request_id>/approve/', views.approve_signup_request_view, name='approve-signup-request'),
    path('signup-requests/<uuid:request_id>/reject/', views.reject_signup_request_view, name='reject-signup-request'),
    path('signup-request-status/<str:username>/', views.check_signup_request_status_view, name='check-signup-request-status'),
    
    # Student Password Reset endpoints
    path('students/password-reset/request/', password_reset_views.student_password_reset_request, name='student-password-reset-request'),
    path('students/password-reset/verify/', password_reset_views.student_otp_verification, name='student-otp-verification'),
    path('students/password-reset/confirm/', password_reset_views.student_password_reset_confirm, name='student-password-reset-confirm'),
    
    # Admin Password Reset endpoints
    path('admin/password-reset/request/', password_reset_views.admin_password_reset_request, name='admin-password-reset-request'),
    path('admin/password-reset/verify/', password_reset_views.admin_otp_verification, name='admin-otp-verification'),
    path('admin/password-reset/confirm/', password_reset_views.admin_password_reset_confirm, name='admin-password-reset-confirm'),
]
