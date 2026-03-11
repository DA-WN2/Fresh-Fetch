from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    stock_status = serializers.ReadOnlyField()
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'original_price', 'current_price', 
            'stock_quantity', 'stock_status', 'is_near_expiry', 'store_name',
            'category_name', 'manufactured_date', 'expiry_date', 'unit'
        ]