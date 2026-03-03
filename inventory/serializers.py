from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    # We include these custom fields to show the "Smart Pricing" logic impact
    stock_status = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'original_price', 'current_price', 
            'stock_quantity', 'stock_status', 'is_near_expiry'
        ]