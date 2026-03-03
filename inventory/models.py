from django.db import models
from django.utils import timezone
from datetime import date
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    description = models.TextField(blank=True)
    
    # Pricing
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Inventory details
    stock_quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=20, default="kg")
    
    # Smart logic fields
    manufactured_date = models.DateField()
    expiry_date = models.DateField()
    is_near_expiry = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    def check_and_update_smart_pricing(self):
        """
        Use Case 1: Automated Shelf-Life Aware Pricing.
        If the product is within 3 days of expiry, mark it as near-expiry 
        and apply a 30% discount automatically.
        """
        days_to_expiry = (self.expiry_date - date.today()).days
        
        if 0 <= days_to_expiry <= 3:
            self.is_near_expiry = True
            # Apply 30% discount logic
            discounted_price = float(self.original_price) * 0.70
            self.current_price = round(discounted_price, 2)
        else:
            self.is_near_expiry = False
            self.current_price = self.original_price
        
        self.save()

    def check_stock_status(self):
        """
        Use Case 2: Silent Stock Depletion Detection.
        Simple logic to flag products that are out of stock.
        """
        if self.stock_quantity == 0:
            return "Out of Stock"
        elif self.stock_quantity < 5:
            return "Low Stock Alert"
        return "In Stock"
    @property
    def stock_status(self):
        """
        Use Case 2: Silent Stock Depletion Detection.
        Flags items based on inventory thresholds.
        """
        if self.stock_quantity == 0:
            return "OUT OF STOCK"
        elif self.stock_quantity <= 5:
            return "LOW STOCK (Reorder Soon)"
        return "STABLE"
    # def calculate_supplier_urgency(self):
    #     """
    #     Use Case 3: Supplier Reliability & Urgency Scoring.
    #     Determines how critical the replenishment is for the supply chain.
    #     """
    #     if self.stock_quantity <= 2:
    #         return "CRITICAL - Immediate Restock Required"
    #     return "ROUTINE - Restock within 24 hours"
    def trigger_supplier_restock(self):
        """
        Use Case 3: Proactive Supply Chain Management.
        Simulates an API call to a specific Supplier for replenishment.
        """
        if self.stock_quantity <= 2:
            return f"SENT: Restock request for {self.name} to assigned Supplier."
        return "Stock levels sufficient."
    def get_logistics_priority(self):
        """
        Use Case 4: Logistics & Multi-Vendor Routing.
        Categorizes items for delivery agent efficiency.
        """
        if self.category.name == "Perishables":
            return "EXPRESS - Priority Cold-Chain Delivery"
        return "STANDARD - Routine Delivery"

class Order(models.Model):
    # Link to the user who placed the order
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use Case 4 Logic: Track if the whole order needs Express/Cold-Chain
    is_express = models.BooleanField(default=False) 
    
    # Payment Status
    status = models.CharField(max_length=20, default="Pending") # Pending, Paid, Shipped
    transaction_id = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Order {self.id} - {self.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
    