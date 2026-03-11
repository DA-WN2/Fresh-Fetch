from django.urls import path
from inventory.views import RunPricingEngineView, ReportAuditView
from .views import (
    CustomerDealZone, 
    PlaceOrderView, 
    LoginView, 
    RegisterView,
    MyOrdersView,
    UserProfileView,
    CancelOrderView,    # Added missing import
    # TransferOrderView, 
    dashboard_redirect
)

urlpatterns = [
    # Marketplace and Deals
    path('deals/', CustomerDealZone.as_view(), name='customer-deals'),
    
    # Checkout and Payment
    path('place-order/', PlaceOrderView.as_view(), name='place-order'),

    # Orders History
    path('my-orders/', MyOrdersView.as_view(), name='my-orders'),

    # User Account Profile
    path('profile/', UserProfileView.as_view(), name='profile'),

    # Authentication & Role-Based Access
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    
    # --- ORDER ACTIONS ---
    # Fix for the 404 error: Added the cancellation path
    path('cancel-order/<int:order_id>/', CancelOrderView.as_view(), name='cancel-order'),
    
    # Peer-to-Peer Transfer
    # path('transfer-order/<int:order_id>/', TransferOrderView.as_view(), name='transfer-order'),

    # Traditional Django Template Redirect (Optional Fallback)
    path('dashboard-redirect/', dashboard_redirect, name='dashboard-redirect'),
    path('api/manager/run-pricing-engine/', RunPricingEngineView.as_view(), name='run-pricing'),
    path('api/manager/report-audit/', ReportAuditView.as_view(), name='report-audit'),


]