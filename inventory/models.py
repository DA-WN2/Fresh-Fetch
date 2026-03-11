from django.db import models
from django.utils import timezone
from datetime import date
from django.conf import settings

# --- 1. MULTI-STORE HUB ---
class Store(models.Model):
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=255)
    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='managed_store'
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.location})"

# --- 2. CATEGORY ---
class Category(models.Model):
    name = models.CharField(max_length=100)
    class Meta:
        verbose_name_plural = "Categories"
    def __str__(self):
        return self.name

# --- 3. SUPPLIER RELIABILITY ---
class Supplier(models.Model):
    # --- ADD THIS LINE so a supplier can log in! ---
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='supplier_profile')
    
    name = models.CharField(max_length=255)
    contact_email = models.EmailField(blank=True, null=True)
    reliability_score = models.FloatField(default=10.0)
    quality_rating = models.FloatField(default=5.0)

# --- 4. PRODUCT ---
class Product(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products', null=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    description = models.TextField(blank=True)
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=20, default="kg")
    manufactured_date = models.DateField()
    expiry_date = models.DateField()
    is_near_expiry = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} - {self.store.name if self.store else 'No Store'}"

    # NEW: Logic for stock status (Fixes AttributeError in Admin and API)
    @property
    def stock_status(self):
        """Dynamically calculates the stock status for the Admin Panel and API."""
        if self.stock_quantity <= 0:
            return "Out of Stock"
        elif self.stock_quantity <= 5:
            return "Low Stock"
        return "In Stock"

    def check_and_update_smart_pricing(self):
        """Use Case: Shelf-Aware Pricing Logic."""
        days_to_expiry = (self.expiry_date - date.today()).days
        if 0 <= days_to_expiry <= 3:
            self.is_near_expiry = True
            discounted_price = float(self.original_price) * 0.70
            self.current_price = round(discounted_price, 2)
        else:
            self.is_near_expiry = False
            self.current_price = self.original_price
        self.save()

# --- 5. ORDERS & LOGISTICS ---
# --- 5. ORDERS & LOGISTICS ---
# --- 5. ORDERS & LOGISTICS ---
class Order(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='orders', null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    packing_photo = models.ImageField(upload_to='packing_photos/', blank=True, null=True)
    delivery_photo = models.ImageField(upload_to='delivery_photos/', blank=True, null=True)

    delivery_agent = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='assigned_deliveries', on_delete=models.SET_NULL, null=True, blank=True)#new
    delivery_address = models.TextField(blank=True, null=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    is_express = models.BooleanField(default=False) 
    
    is_transferred = models.BooleanField(default=False) 
    # NEW: Store the username of the person who sent it!
    transferred_by = models.CharField(max_length=150, blank=True, null=True) 
    
    status = models.CharField(max_length=20, default="Pending") 
    transaction_id = models.CharField(max_length=100, blank=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)

# --- 6. ERP LOGGING ---
class WasteLog(models.Model):
    REASONS = [
        ('Theft', 'Theft/Shrinkage'),
        ('Expired', 'Expiry Disposal'),
        ('Damaged', 'Damaged in Transit'),
    ]
    product_name = models.CharField(max_length=200)
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    quantity_lost = models.PositiveIntegerField()
    reason = models.CharField(max_length=20, choices=REASONS)
    carbon_footprint_est = models.FloatField(default=0.0) 
    financial_loss = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

class RestockOrder(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    expected_delivery = models.DateField()
    actual_delivery = models.DateField(null=True, blank=True)
    quality_received = models.IntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default="Pending")