from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
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
        # Redirect to the React marketplace home
        return redirect('/') 
    elif request.user.role == 'supplier':
        return redirect('/api/inventory/reorders/')
    return redirect('/')

# --- REACT API VIEWS (Modern) ---

class RegisterView(APIView):
    """
    Handles User Registration and ensures passwords are encrypted.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        try:
            username = data.get('username', '').strip()
            email = data.get('email', '').strip()
            password = data.get('password', '')
            role = data.get('role', 'customer')
            
            print(f"\n[REGISTER DEBUG] Attempting to register user: {username}")
            print(f"[REGISTER DEBUG] Email: {email}, Role: {role}")
            
            if not username or not password:
                return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(username=username).exists():
                print(f"[REGISTER DEBUG] Username {username} already exists")
                return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)

            # create_user automatically hashes the password for MySQL
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role
            )
            print(f"[REGISTER DEBUG] User {username} created successfully")
            print(f"[REGISTER DEBUG] User ID: {user.id}, is_active: {user.is_active}")
            print(f"[REGISTER DEBUG] Password hash stored: {user.password[:50]}...")
            
            return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"[REGISTER DEBUG] Error during registration: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    Handles Authentication and returns Token + Role for React redirection.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        
        print(f"\n[LOGIN DEBUG] Login attempt for username: {username}")
        print(f"[LOGIN DEBUG] Password provided: {len(password)} characters")
        
        # Check if user exists first
        try:
            user_obj = User.objects.get(username=username)
            print(f"[LOGIN DEBUG] User found in database: {user_obj.username}")
            print(f"[LOGIN DEBUG] User is_active: {user_obj.is_active}")
            print(f"[LOGIN DEBUG] User role: {user_obj.role}")
            print(f"[LOGIN DEBUG] Stored password hash: {user_obj.password[:50]}...")
        except User.DoesNotExist:
            print(f"[LOGIN DEBUG] User {username} NOT found in database")
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Try to authenticate
        user = authenticate(username=username, password=password)
        
        if user:
            print(f"[LOGIN DEBUG] Authentication SUCCESSFUL for {username}")
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "role": user.role,  # Used by Login.jsx to navigate
                "username": user.username,
                "message": "Login successful"
            })
        
        print(f"[LOGIN DEBUG] Authentication FAILED for {username}")
        print(f"[LOGIN DEBUG] Check: Password might be incorrect or user is inactive")
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class CustomerDealZone(APIView):
    """
    Use Case 5: Dynamic Personalization.
    Fetches Smart Deals and standard inventory.
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
    Use Case 2: Stock Depletion.
    Updates MySQL inventory and handles Guest/Authenticated checkouts.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        items_data = request.data.get('items', [])
        if not items_data:
            return Response({"error": "No items in cart"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = request.user if request.user.is_authenticated else None
                order = Order.objects.create(user=user, status='Pending')

                for item in items_data:
                    product = Product.objects.select_for_update().get(id=item['id'])
                    qty = item.get('quantity', 1)

                    if product.stock_quantity < qty:
                        raise ValueError(f"Insufficient stock for {product.name}")

                    product.stock_quantity -= qty
                    product.save()

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=qty,
                        price_at_purchase=product.current_price
                    )
            return Response({"message": "Order placed!", "order_id": order.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MyOrdersView(APIView):
    """
    Fetches all orders for the authenticated user.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
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
                "is_express": order.is_express,
                "items": items_data,
                "total_amount": sum(float(item.price_at_purchase) * item.quantity for item in order.items.all()),
            })
        
        return Response(order_data, status=status.HTTP_200_OK)