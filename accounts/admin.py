from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# This tells Django how to display your custom User model
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Add your custom 'role' field to the admin forms
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number')}),
    )
    # Show the role in the user list view
    list_display = ('username', 'email', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')