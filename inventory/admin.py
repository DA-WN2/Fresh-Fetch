from django.contrib import admin
from django.utils.html import format_html
from .models import Product, Category

admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # USE CASE 2: Displaying stock status visually for the Store Manager
    list_display = (
        'name', 
        'category', 
        'original_price', 
        'current_price', 
        'stock_quantity', 
        'get_stock_status', # This calls our colored alert method below
        'expiry_date', 
        'is_near_expiry',
        'get_delivery_priority'
    )
    
    # Allows for easy filtering during your presentation demo
    list_filter = ('is_near_expiry', 'category')
    
    # USE CASE 1: The "Smart Pricing" trigger action
    actions = ['run_smart_update','notify_suppliers']

    def get_stock_status(self, obj):
        """
        Calculates and returns a color-coded status badge for the admin list view.
        """
        status = obj.stock_status # Accesses the property from models.py
        
        if status == "OUT OF STOCK":
            # format_html requires the tag and the value as separate arguments
            return format_html('<b style="color:red;">{}</b>', status)
        elif status == "LOW STOCK (Reorder Soon)":
            return format_html('<b style="color:orange;">{}</b>', status)
        
        # FIX: Added the 'status' variable here to resolve the TypeError
        return format_html('<span style="color:green;">{}</span>', status)

    # Sets the column name in the Admin interface
    get_stock_status.short_description = 'Inventory Alert'

    def run_smart_update(self, request, queryset):
        """
        Executes the smart pricing logic for all selected products.
        """
        for product in queryset:
            product.check_and_update_smart_pricing()
        self.message_user(request, "Smart pricing and expiry checks completed!")
    
    run_smart_update.short_description = "Run Smart Pricing Logic"
    def notify_suppliers(self, request, queryset):
        for product in queryset:
            msg = product.trigger_supplier_restock()
            self.message_user(request, msg)
    notify_suppliers.short_description = "Send Restock Request to Supplier"
    def get_delivery_priority(self, obj):
        # Displays the logistics priority in the table
        priority = obj.get_logistics_priority()
        if "PRIORITY" in priority:
            return format_html('<span style="color:blue; font-weight:bold;">{}</span>', priority)
        return priority
    
    get_delivery_priority.short_description = 'Logistics Priority'

# Register Category to manage standard product groups
admin.site.register(Category)