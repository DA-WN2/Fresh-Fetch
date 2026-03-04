from django.urls import path
from .views import (
    CustomerDealZone, 
    PlaceOrderView, 
    LoginView, 
    RegisterView,
    MyOrdersView
)

urlpatterns = [
    # Marketplace and Deals
    path('deals/', CustomerDealZone.as_view(), name='customer-deals'),
    
    # Checkout and Payment
    path('place-order/', PlaceOrderView.as_view(), name='place-order'),

    # Orders
    path('my-orders/', MyOrdersView.as_view(), name='my-orders'),

    # Authentication & Role-Based Access
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
]