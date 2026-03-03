from django.contrib import admin
from django.urls import path, include
from .views import dashboard_redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    # Use Case: Role-Based Entry Point
    path('dashboard/', dashboard_redirect, name='dashboard_redirect'),
    
    # App-specific URLs
    path('api/inventory/', include('inventory.urls')),
    path('api/customer/', include('customers.urls')), # Points to the new file
    
    # Built-in Login/Logout views
    path('accounts/', include('django.contrib.auth.urls')),
]