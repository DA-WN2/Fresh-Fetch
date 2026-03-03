from django.urls import path
from .views import CustomerDealZone, PlaceOrderView # Ensure you import the view

urlpatterns = [
    # Existing deals endpoint
    path('deals/', CustomerDealZone.as_view(), name='customer-deals'),
    
    # ADD THIS LINE to resolve the 404 error
    path('place-order/', PlaceOrderView.as_view(), name='place-order'),
]