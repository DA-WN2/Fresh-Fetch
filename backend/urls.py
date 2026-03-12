from django.contrib import admin
from django.urls import path, include
from .views import dashboard_redirect
from django.conf import settings
from django.conf.urls.static import static

# Import all Manager views including the new analytics tools
from inventory.views import (
    ManagerInventoryView, 
    ManagerOrdersView, 
    UpdateOrderStatusView,
    RunPricingEngineView,
    ReportAuditView,
    EnvironmentalImpactView,
    SupplierScoresView,
    TriggerRestockView,
    ManagerProductDetailView,
    CustomerCheckoutView,
    ProductList,
    ProductDetailView,
    WasteReportView,
    CustomerOrderHistoryView,
    TransferOrderView,
    UploadPackingPhotoView,
    DeliveryOrdersView, 
    DeliveryUpdateStatusView,
    AvailableDeliveryAgentsView, 
    AssignDeliveryAgentView,
    SupplierRestockOrdersView, 
    UpdateRestockOrderStatusView,
    PendingEvaluationsView,
    EvaluateSupplierView,
    ManagerStoreProfileView  # <-- NEW: Imported here!
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Use Case: Role-Based Entry Point
    path('dashboard/', dashboard_redirect, name='dashboard_redirect'),
    
    # App-specific URLs
    path('api/inventory/', include('inventory.urls')),
    path('api/customer/', include('customers.urls')), 
    path('api/customer/checkout/', CustomerCheckoutView.as_view(), name='customer-checkout'),
    path('api/customer/orders/', CustomerOrderHistoryView.as_view(), name='customer-orders'),
    path('api/products/', ProductList.as_view(), name='product-list'),
    path('api/products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('api/customer/forward-order/<int:order_id>/', TransferOrderView.as_view(), name='forward-order'),
    
    # --- MANAGER DASHBOARD API ROUTES ---
    path('api/manager/inventory/', ManagerInventoryView.as_view(), name='manager-inventory'),
    path('api/manager/orders/', ManagerOrdersView.as_view(), name='manager-orders'),
    path('api/manager/update-order-status/<int:order_id>/', UpdateOrderStatusView.as_view(), name='update-order-status'),
    path('api/manager/waste-report/', WasteReportView.as_view(), name='waste-report'),
    path('api/manager/upload-photo/<int:order_id>/', UploadPackingPhotoView.as_view(), name='upload-photo'),
    
    # --- NEW: Store Profile Route (Pickup Address) ---
    path('api/manager/store-profile/', ManagerStoreProfileView.as_view(), name='store-profile'),
    
    # Advanced Enterprise Utilities
    path('api/manager/run-pricing-engine/', RunPricingEngineView.as_view(), name='run-pricing'),
    path('api/manager/report-audit/', ReportAuditView.as_view(), name='report-audit'),
    
    # Analytics & Sustainability Reporting
    path('api/manager/impact-report/', EnvironmentalImpactView.as_view(), name='impact-report'),
    path('api/manager/supplier-scores/', SupplierScoresView.as_view(), name='supplier-scores'), 
    path('api/manager/trigger-restock/', TriggerRestockView.as_view(), name='trigger-restock'),

    path('api/manager/inventory/<int:pk>/', ManagerProductDetailView.as_view(), name='manager-product-detail'),

    # --- NEW: Evaluation Routes ---
    path('api/manager/pending-evaluations/', PendingEvaluationsView.as_view(), name='pending-evaluations'),
    path('api/manager/evaluate-supplier/<int:order_id>/', EvaluateSupplierView.as_view(), name='evaluate-supplier'),

    # Supplier 
    path('api/supplier/orders/', SupplierRestockOrdersView.as_view(), name='supplier-orders'),
    path('api/supplier/update-order/<int:order_id>/', UpdateRestockOrderStatusView.as_view(), name='supplier-update-order'),
    
    # Built-in Login/Logout views
    path('accounts/', include('django.contrib.auth.urls')),

    # Delivery 
    path('api/delivery/orders/', DeliveryOrdersView.as_view(), name='delivery-orders'),
    path('api/delivery/update-order/<int:order_id>/', DeliveryUpdateStatusView.as_view(), name='delivery-update'), 
    path('api/manager/delivery-agents/', AvailableDeliveryAgentsView.as_view(), name='delivery-agents'),
    path('api/manager/assign-agent/<int:order_id>/', AssignDeliveryAgentView.as_view(), name='assign-agent'),
   
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)