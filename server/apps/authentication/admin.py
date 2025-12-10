"""
Authentication Admin
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SignupRequest


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin interface for User model
    """
    list_display = [
        'username',
        'email',
        'role',
        'account_status',
        'admission_status',
        'is_staff',
        'created_at'
    ]
    list_filter = [
        'role',
        'account_status',
        'admission_status',
        'is_staff',
        'is_superuser',
        'is_active'
    ]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {
            'fields': (
                'role',
                'account_status',
                'admission_status',
                'related_profile_id',
                'mobile_number'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {
            'fields': (
                'role',
                'account_status',
                'admission_status',
                'mobile_number'
            )
        }),
    )



@admin.register(SignupRequest)
class SignupRequestAdmin(admin.ModelAdmin):
    """
    Admin interface for SignupRequest model
    """
    list_display = [
        'username',
        'email',
        'first_name',
        'last_name',
        'requested_role',
        'status',
        'reviewed_by',
        'created_at'
    ]
    list_filter = [
        'status',
        'requested_role',
        'created_at',
        'reviewed_at'
    ]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at', 'password_hash']
    
    fieldsets = (
        ('Request Information', {
            'fields': (
                'id',
                'username',
                'email',
                'first_name',
                'last_name',
                'mobile_number',
                'requested_role',
                'password_hash'
            )
        }),
        ('Status', {
            'fields': (
                'status',
                'reviewed_by',
                'reviewed_at',
                'rejection_reason',
                'created_user'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
