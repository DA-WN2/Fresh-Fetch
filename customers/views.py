from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.db import transaction
from inventory.models import Product, Order, OrderItem
from inventory.serializers import ProductSerializer

class CustomerDealZone(APIView):
    """
    Use Case 5: Dynamic Personalization.
    Fetches both Smart Deals (near expiry) and standard inventory.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Optimized query: only get products actually in stock
        # Filter for the Smart Deal section (is_near_expiry=True)
        deals = Product.objects.filter(is_near_expiry=True, stock_quantity__gt=0)
        
        # Filter for the Standard Inventory section (is_near_expiry=False)
        all_products = Product.objects.filter(is_near_expiry=False, stock_quantity__gt=0)
        
        serializer = ProductSerializer(deals, many=True)
        all_serializer = ProductSerializer(all_products, many=True)
        
        return Response({
            "message": "Fresh-Fetch Marketplace Data",
            "products": serializer.data,
            "all_products": all_serializer.data,
        })

class PlaceOrderView(APIView):
    """
    Use Case 2: Stock Depletion & Guest Checkout.
    Processes payments and updates MySQL inventory safely without requiring login.
    """
    permission_classes = [AllowAny] # Fixes the 403 error for non-logged in users

    def post(self, request):
        items_data = request.data.get('items', [])
        
        if not items_data:
            return Response({"error": "No items in cart"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Atomic transaction ensures database integrity
            with transaction.atomic():
                # Handle Guest User: assign order to user if logged in, otherwise None
                user = request.user if request.user.is_authenticated else None
                
                order = Order.objects.create(
                    user=user, 
                    status='Pending'
                )

                for item in items_data:
                    # select_for_update locks the row to prevent race conditions
                    product = Product.objects.select_for_update().get(id=item['id'])
                    qty_to_buy = item.get('quantity', 1)

                    # Use Case 2: Verify and decrease stock
                    if product.stock_quantity < qty_to_buy:
                        raise ValueError(f"Insufficient stock for {product.name}")

                    product.stock_quantity -= qty_to_buy
                    product.save()

                    # Record the line item at the current purchase price
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=qty_to_buy,
                        price_at_purchase=product.current_price
                    )

            return Response({
                "message": "Order placed successfully!", 
                "order_id": order.id
            }, status=status.HTTP_201_CREATED)

        except Product.DoesNotExist:
            return Response({"error": "One or more products were not found"}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Catch-all for other unexpected backend issues
            return Response({"error": "Internal Server Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)