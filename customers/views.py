from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated 
from rest_framework import status
from rest_framework.authtoken.models import Token

from inventory.models import Product, Order, OrderItem
from inventory.serializers import ProductSerializer

User = get_user_model()

# --- DJANGO TEMPLATE REDIRECT (Traditional) ---

@login_required
def dashboard_redirect(request):
    """
    Use Case: Secure Role-Based Entry.
    Automatically routes users based on their 'accounts.User' role.
    """
    if request.user.role == 'manager':
        return redirect('/admin/')
    elif request.user.role == 'customer':
        return redirect('/') 
    elif request.user.role == 'supplier':
        return redirect('/api/inventory/reorders/')
    return redirect('/')

# --- REACT API VIEWS (Modern) ---

class RegisterView(APIView):
    """
    Handles User Registration and ensures passwords are encrypted.
    NOW ACCEPTS PHONE NUMBER.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        try:
            username = data.get('username', '').strip()
            email = data.get('email', '').strip()
            password = data.get('password', '')
            role = data.get('role', 'customer')
            
            # --- NEW: Get the phone number from React ---
            phone_number = data.get('phone_number', '').strip()
            
            if not username or not password:
                return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(username=username).exists():
                return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)

            # --- NEW: Save the phone number to the database ---
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role,
                phone_number=phone_number 
            )
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    Handles Authentication and returns Token + Role for React redirection.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        user = authenticate(username=username, password=password)
        
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "role": user.role,
                "username": user.username,
                "message": "Login successful"
            })
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class UserProfileView(APIView):
    """
    Fetches profile details for the authenticated user.
    NOW INCLUDES PHONE NUMBER.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "role": user.role,
            # --- NEW: Send the phone number to the Profile.jsx page ---
            "phone_number": getattr(user, 'phone_number', 'Not Provided'),
            "date_joined": user.date_joined,
        }, status=status.HTTP_200_OK)

class CustomerDealZone(APIView):
    """
    Use Case 5: Dynamic Personalization.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        deals = Product.objects.filter(is_near_expiry=True, stock_quantity__gt=0)
        all_products = Product.objects.filter(is_near_expiry=False, stock_quantity__gt=0)
        
        return Response({
            "message": "Fresh-Fetch Marketplace Data",
            "products": ProductSerializer(deals, many=True).data,
            "all_products": ProductSerializer(all_products, many=True).data,
        })

class PlaceOrderView(APIView):
    """
    Use Case 2 & 4: Stock Depletion & Express Routing.
    Updates MySQL inventory and handles order creation with logistics flags.
    NOW INCLUDES: Multi-Store Auto-Routing.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        items_data = request.data.get('items', [])
        if not items_data:
            return Response({"error": "No items in cart"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = request.user if request.user.is_authenticated else None
                
                # --- SMART STORE ROUTING ---
                # Identify which store should fulfill this order by looking at the first item
                first_product_id = items_data[0]['id']
                first_product = Product.objects.get(id=first_product_id)
                assigned_store = first_product.store 
                
                # Create the order and link it directly to that local branch
                order = Order.objects.create(
                    user=user, 
                    status='Pending',
                    store=assigned_store # Order routed to the Manager!
                )
                
                requires_express = False

                for item in items_data:
                    product = Product.objects.select_for_update().get(id=item['id'])
                    qty = item.get('quantity', 1)

                    # Cart Integrity Check: Ensure they aren't mixing items from different branches
                    if product.store != assigned_store:
                        raise ValueError("Cart contains items from different branches. Please check out separately.")

                    if product.stock_quantity < qty:
                        raise ValueError(f"Insufficient stock for {product.name}")

                    # Use Case 4: Upgrade to Express if Perishable
                    if product.category.name == "Perishables":
                        requires_express = True

                    product.stock_quantity -= qty
                    product.save()

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=qty,
                        price_at_purchase=product.current_price
                    )
                
                if requires_express:
                    order.is_express = True
                    order.save()

            store_name = assigned_store.name if assigned_store else "HQ"
            return Response({
                "message": f"Order placed successfully and routed to {store_name}!", 
                "order_id": order.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MyOrdersView(APIView):
    """
    Fetches all orders for the authenticated user.
    Now includes 'is_received' flag for transferred orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items').order_by('-created_at')
        
        order_data = []
        for order in orders:
            items_data = [
                {
                    "id": item.product.id,
                    "name": item.product.name,
                    "quantity": item.quantity,
                    "price": str(item.price_at_purchase),
                }
                for item in order.items.all() 
            ]
            
            order_data.append({
                "id": order.id,
                "created_at": order.created_at,
                "status": order.status,
                "is_express": getattr(order, 'is_express', False),
                "is_received": getattr(order, 'is_transferred', False), # Matches database field
                "items": items_data,
                "total_amount": sum(float(item.price_at_purchase) * item.quantity for item in order.items.all()),
            })
        
        return Response(order_data, status=status.HTTP_200_OK)

class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        try:
            # First, find the order by ID only to see who owns it
            order = Order.objects.get(id=order_id)
            
            # Use Case: Permission check for Transferred Orders
            if order.user != request.user:
                return Response(
                    {"error": f"Access Denied. Order #{order.id} now belongs to '{order.user.username}'."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Ensure it is still in Pending status
            if order.status.lower() != 'pending':
                return Response(
                    {"error": f"Cannot cancel an order that is already {order.status}."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # If checks pass, proceed with stock restoration
            with transaction.atomic():
                order.status = 'Cancelled'
                order.save()
                for item in order.items.all():
                    item.product.stock_quantity += item.quantity
                    item.product.save()

            return Response({"message": "Order cancelled successfully."})

        except Order.DoesNotExist:
            return Response({"error": "Order ID not found."}, status=status.HTTP_404_NOT_FOUND)
        
class TransferOrderView(APIView):
    """
    Use Case: Third-Party Access.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        recipient_username = request.data.get('recipient_username')
        
        try:
            order = Order.objects.get(id=order_id, user=request.user)
            
            if order.status.lower() in ['shipped', 'delivered', 'cancelled']:
                return Response({"error": "Order cannot be transferred at this stage."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                recipient = User.objects.get(username=recipient_username)
            except User.DoesNotExist:
                return Response({"error": "Recipient user not found."}, status=status.HTTP_404_NOT_FOUND)

            with transaction.atomic():
                order.user = recipient
                order.is_transferred = True # Persistently mark as transferred
                order.save()

            return Response({"message": f"Order #{order_id} successfully transferred to {recipient_username}!"})

        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)