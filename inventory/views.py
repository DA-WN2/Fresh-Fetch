from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
import datetime
from collections import defaultdict
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.parsers import JSONParser

# Model and Serializer imports
from .models import Product, Order, OrderItem, Store, WasteLog, Supplier, RestockOrder, Category
from .serializers import ProductSerializer

# --- CUSTOMER VIEWS ---
User = get_user_model()

class ProductList(generics.ListAPIView):
    """USE CASE: Customer Storefront. Hides expired items automatically."""
    serializer_class = ProductSerializer

    def get_queryset(self):
        # Only return items where the expiry date is today or in the future
        return Product.objects.filter(expiry_date__gte=timezone.now().date(), stock_quantity__gt=0)

class CustomerCheckoutView(APIView):
    """
    USE CASE: Multi-Vendor Checkout Splitter.
    Takes 1 customer cart, splits it into multiple store-specific orders, 
    and returns 1 combined bill.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, 'role', '') == 'manager':
            return Response({"error": "Managers cannot place customer orders."}, status=status.HTTP_403_FORBIDDEN)

        # Expected payload: {"cart_items": [{"product_id": 1, "quantity": 2}], "delivery_address": "123 Main St"}
        cart_items = request.data.get('cart_items', [])
        
        # NEW: Extract the delivery address sent from React Checkout.jsx
        delivery_address = request.data.get('delivery_address', 'Address not provided')

        if not cart_items:
            return Response({"error": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        store_item_map = defaultdict(list)
        grand_total = 0

        try:
            with transaction.atomic():
                # 1. Verify Stock & Group items by Store
                for item in cart_items:
                    # select_for_update prevents race conditions (no double-selling last item)
                    product = Product.objects.select_for_update().get(id=item['product_id'])
                    qty = int(item['quantity'])

                    if product.stock_quantity < qty:
                        raise Exception(f"Not enough stock for {product.name}. Only {product.stock_quantity} left.")

                    # Group this item under its specific store
                    store_item_map[product.store].append({
                        'product': product,
                        'quantity': qty
                    })

                # 2. Generate a separate Order for each Store Manager
                created_order_ids = []
                for store, items in store_item_map.items():
                    
                    # NEW: Pass the delivery_address to the database
                    order = Order.objects.create(
                        store=store,
                        user=request.user,
                        delivery_address=delivery_address, 
                        status="Pending"
                    )
                    created_order_ids.append(order.id)

                    # Add items to the store's specific order
                    for i in items:
                        product = i['product']
                        qty = i['quantity']
                        price = product.current_price

                        OrderItem.objects.create(
                            order=order,
                            product=product,
                            quantity=qty,
                            price_at_purchase=price
                        )

                        # Deduct from physical inventory
                        product.stock_quantity -= qty
                        product.save()

                        # Add to the customer's combined bill
                        grand_total += (price * qty)

            # 3. Return a single response for the React Frontend
            return Response({
                "message": "Checkout successful!",
                "grand_total": str(grand_total),
                "store_orders_generated": len(created_order_ids)
            }, status=status.HTTP_201_CREATED)

        except Product.DoesNotExist:
            return Response({"error": "One or more products in your cart no longer exist."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# --- MANAGER: INVENTORY CATALOG (CRUD) ---

class ManagerInventoryView(APIView):
    """Fetches inventory strictly for the manager's assigned store AND allows creating new products."""
    
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied. Managers only."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            store = request.user.managed_store
        except Exception:
            return Response({"error": "No store assigned to this manager account."}, status=status.HTTP_400_BAD_REQUEST)

        products = Product.objects.filter(store=store).select_related('category', 'supplier')
        today = timezone.now().date()
        
        data = []
        for p in products:
            # NEW LOGIC: Evaluate the exact status based on the date
            if p.expiry_date < today:
                expiry_status = "Expired"
            elif p.is_near_expiry:
                expiry_status = "Near Expiry"
            else:
                expiry_status = "Fresh"

            data.append({
                "id": p.id,
                "name": p.name,
                "category_id": p.category.id if p.category else None,
                "supplier_id": p.supplier.id if p.supplier else None,
                "original_price": str(p.original_price),
                "current_price": str(p.current_price),
                "stock_quantity": p.stock_quantity,
                "expiry_date": p.expiry_date,
                "is_near_expiry": p.is_near_expiry,
                "expiry": expiry_status # Pass the evaluated status
            })
        return Response(data)

    def post(self, request):
        """CREATE a new product for this branch"""
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            store = request.user.managed_store
            data = request.data
            
            category = get_object_or_404(Category, id=data.get('category_id'))
            supplier = get_object_or_404(Supplier, id=data.get('supplier_id')) if data.get('supplier_id') else None

            product = Product.objects.create(
                store=store,
                name=data['name'],
                category=category,
                supplier=supplier,
                original_price=data['price'],
                current_price=data['price'],
                stock_quantity=data['stock_quantity'],
                manufactured_date=data.get('manufactured_date', timezone.now().date()),
                expiry_date=data['expiry_date']
            )
            return Response({
                "message": f"{product.name} added successfully!", 
                "id": product.id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ManagerProductDetailView(APIView):
    """USE CASE: Edit (PUT) or Delete (DELETE) a specific product"""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            product = get_object_or_404(Product, id=pk, store=request.user.managed_store)
            data = request.data
            
            if 'name' in data: product.name = data['name']
            if 'price' in data: 
                product.original_price = data['price']
                product.current_price = data['price'] 
            if 'stock_quantity' in data: product.stock_quantity = data['stock_quantity']
            if 'expiry_date' in data: product.expiry_date = data['expiry_date']
            
            product.save()
            return Response({"message": f"{product.name} updated successfully!"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        product = get_object_or_404(Product, id=pk, store=request.user.managed_store)
        product_name = product.name
        product.delete()
        return Response({"message": f"{product_name} has been deleted."})


# --- MANAGER: FULFILLMENT & LOGISTICS ---

class ManagerOrdersView(APIView):
    """USE CASE: Fulfillment Queue. Now strictly sends Delivery Addresses and Photo status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            store = request.user.managed_store
        except Exception:
            return Response({"error": "No store assigned."}, status=status.HTTP_400_BAD_REQUEST)

        orders = Order.objects.filter(store=store).prefetch_related('items__product').order_by('-created_at')
        
        data = []
        for o in orders:
            items_data = [{"name": item.product.name, "quantity": item.quantity} for item in o.items.all()]
            data.append({
                "id": o.id,
                "status": o.status,
                "is_express": getattr(o, 'is_express', False),
                "created_at": o.created_at,
                "items": items_data,
                "delivery_address": o.delivery_address if o.delivery_address else "Pickup Routine",
                "hasUploadedPhoto": bool(o.packing_photo), # Pass boolean so React can disable "Mark Shipped"
                "delivery_photo": request.build_absolute_uri(o.delivery_photo.url) if o.delivery_photo else None,
                "delivery_agent": o.delivery_agent.username if o.delivery_agent else None,
                "customer_phone": getattr(o.user, 'phone_number', 'Not Provided'),
                "agent_phone": getattr(o.delivery_agent, 'phone_number', 'Not Provided') if o.delivery_agent else None
            })
        return Response(data)

class UpdateOrderStatusView(APIView):
    """USE CASE: Manager Fulfillment. Prevents shipping without a photo validation."""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            store = request.user.managed_store
            order = Order.objects.get(id=order_id, store=store)
            new_status = request.data.get('status')
            
            if new_status:
                # --- NEW VALIDATION RULE ADDED HERE ---
                # Check if they are trying to mark it shipped, but have no photo uploaded.
                if new_status.lower() == 'shipped' and not order.packing_photo:
                    return Response({
                        "error": "You must upload a packing snapshot before marking this order as shipped. It's a security rule!"
                    }, status=status.HTTP_400_BAD_REQUEST)

                order.status = new_status
                order.save()
                return Response({"message": f"Order #{order.id} updated to {new_status}"})
            return Response({"error": "No status provided"}, status=status.HTTP_400_BAD_REQUEST)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

class UploadPackingPhotoView(APIView):
    """USE CASE: Manager Fulfillment. Uploads the snapshot before shipping."""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, order_id):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            store = request.user.managed_store
            order = Order.objects.get(id=order_id, store=store)
            
            # Grab the file sent from React
            packing_image = request.FILES.get('image')
            
            if not packing_image:
                return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

            # Save the image to the database field
            order.packing_photo = packing_image
            order.save()
            
            return Response({
                "message": f"Packing snapshot uploaded for Order #{order.id}!",
                "photo_url": request.build_absolute_uri(order.packing_photo.url)
            }, status=status.HTTP_200_OK)

        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# --- MANAGER: ADVANCED ERP UTILITIES ---

class RunPricingEngineView(APIView):
    """USE CASE: Smart Shelf Management. Discounts near-expiry & Removals expired."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            store = request.user.managed_store
            products = Product.objects.filter(store=store)
            discounted_count = 0
            expired_list = []
            
            with transaction.atomic():
                for product in products:
                    days_to_expiry = (product.expiry_date - timezone.now().date()).days
                    
                    # LOGIC A: ITEM HAS EXPIRED
                    if days_to_expiry < 0 and product.stock_quantity > 0:
                        qty_to_remove = product.stock_quantity
                        expired_list.append(f"{product.name} ({qty_to_remove} units)")
                        
                        # 1. Log to Sustainability/Waste Log
                        WasteLog.objects.create(
                            product_name=product.name,
                            store=store,
                            quantity_lost=qty_to_remove,
                            reason='Expired',
                            financial_loss=qty_to_remove * product.original_price,
                            carbon_footprint_est=qty_to_remove * 0.45
                        )
                        # 2. Remove from online store (Zero stock)
                        product.stock_quantity = 0
                        product.save()

                    # LOGIC B: ITEM IS NEAR EXPIRY (Discount it)
                    else:
                        product.check_and_update_smart_pricing()
                        if product.is_near_expiry:
                            discounted_count += 1
                    
            return Response({
                "message": "Cleanup Complete.",
                "discounted": discounted_count,
                "expired_items": expired_list # Send this list to the React Dashboard
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ReportAuditView(APIView):
    """USE CASE: Physical Stock Audit. Logs shrinkage/theft to WasteLog."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        product_id = request.data.get('product_id')
        try:
            physical_count = int(request.data.get('physical_count', 0))
        except (ValueError, TypeError):
            return Response({"error": "Invalid physical count provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                product = Product.objects.select_for_update().get(id=product_id, store=request.user.managed_store)
                system_count = product.stock_quantity
                discrepancy = system_count - physical_count

                if discrepancy > 0:
                    WasteLog.objects.create(
                        product_name=product.name,
                        store=product.store,
                        quantity_lost=discrepancy,
                        reason='Theft',
                        financial_loss=discrepancy * product.original_price,
                        carbon_footprint_est=discrepancy * 0.45  
                    )

                product.stock_quantity = physical_count
                product.save()

                return Response({
                    "product_name": product.name,
                    "system_count": system_count,
                    "physical_count": physical_count,
                    "discrepancy": discrepancy,
                    "status": "THEFT DETECTED" if discrepancy > 0 else "AUDIT MATCHED"
                })
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

class TriggerRestockView(APIView):
    """USE CASE: 1-Click Supply Chain Restock."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        product_id = request.data.get('product_id')
        restock_qty = int(request.data.get('quantity', 50)) 

        try:
            product = Product.objects.get(id=product_id, store=request.user.managed_store)
            
            if not product.supplier:
                return Response({"error": "No supplier assigned."}, status=status.HTTP_400_BAD_REQUEST)

            RestockOrder.objects.create(
                supplier=product.supplier,
                product=product,
                quantity=restock_qty,
                expected_delivery=timezone.now().date() + datetime.timedelta(days=3)
            )

            return Response({
                "message": f"Restock order placed: {restock_qty} {product.name} from {product.supplier.name}."
            })
            
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# --- MANAGER: ANALYTICS ---

class EnvironmentalImpactView(APIView):
    """USE CASE: Sustainability Dashboard data."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            store = request.user.managed_store
            logs = WasteLog.objects.filter(store=store)
            
            total_carbon = logs.aggregate(Sum('carbon_footprint_est'))['carbon_footprint_est__sum'] or 0
            total_loss = logs.aggregate(Sum('financial_loss'))['financial_loss__sum'] or 0
            theft_count = logs.filter(reason='Theft').count()
            expiry_count = logs.filter(reason='Expired').count()

            return Response({
                "carbon_footprint_kg": round(total_carbon, 2),
                "financial_loss": str(total_loss),
                "theft_incidents": theft_count,
                "expiry_incidents": expiry_count,
                "sustainability_score": max(0, 100 - (expiry_count * 2)) 
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SupplierReliabilityView(APIView):
    """USE CASE: Vendor Scoring system."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        suppliers = Supplier.objects.all()
        data = [
            {
                "id": s.id,
                "name": s.name,
                "reliability_score": s.reliability_score,
                "quality_rating": s.quality_rating,
                "status": "High Reliability" if s.reliability_score > 8 else "Review Required"
            }
            for s in suppliers
        ]
        return Response(data)
    

class ProductDetailView(generics.RetrieveAPIView):
    """Fetches full details for a single product."""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class WasteReportView(APIView):
    """USE CASE: Detailed history of all expired stock for audit/reporting."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            store = request.user.managed_store
            # Fetch all 'Expired' logs, most recent first
            logs = WasteLog.objects.filter(store=store, reason='Expired').order_by('-timestamp')
            
            data = [{
                "id": log.id,
                "product": log.product_name,
                "qty": log.quantity_lost,
                "loss": str(log.financial_loss),
                "carbon": log.carbon_footprint_est,
                "date": log.timestamp.strftime("%d %b %Y, %H:%M")
            } for log in logs]
            
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# --- CUSTOMER ORDER HISTORY ---

class CustomerOrderHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        
        order_data = []
        for order in orders:
            items = OrderItem.objects.filter(order=order)
            
            item_list = []
            order_total = 0 
            
            for item in items:
                item_total = float(item.price_at_purchase) * item.quantity
                order_total += item_total
                
                item_list.append({
                    "name": item.product.name,
                    "quantity": item.quantity,
                    "price": str(item.price_at_purchase)
                })
            
            order_data.append({
                "id": order.id,
                "store_name": order.store.name if order.store else "FreshFetch Fulfillment",
                "status": order.status,
                "total_price": str(round(order_total, 2)), 
                "created_at": order.created_at,
                "delivery_address": order.delivery_address,
                "is_transferred": order.is_transferred,
                "transferred_by": order.transferred_by, 
                # --- NEW: Sent the packing photo URL to React ---
                "packing_photo": request.build_absolute_uri(order.packing_photo.url) if order.packing_photo else None,
                "items": item_list
            })
            
        return Response(order_data)
    

class TransferOrderView(APIView):
    """
    Allows a customer to transfer a pending order to another user,
    while saving the original sender's name so the recipient knows who sent it.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        # 1. Does the order exist?
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"error": f"Database could not find Order #{order_id}."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Does it belong to the logged-in user?
        if order.user != request.user:
            return Response({"error": "You do not have permission to transfer this order."}, status=status.HTTP_403_FORBIDDEN)
            
        # 3. Is it still pending?
        if order.status.lower() != "pending":
            return Response({"error": "Only 'Pending' orders can be transferred."}, status=status.HTTP_400_BAD_REQUEST)

        new_username = request.data.get('username')
        new_address = request.data.get('address')

        if not new_username or not new_address:
            return Response({"error": "Please provide both the recipient's username and delivery address."}, status=status.HTTP_400_BAD_REQUEST)

        if new_username == request.user.username:
            return Response({"error": "You cannot transfer an order to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Does the recipient exist?
        try:
            new_user = User.objects.get(username=new_username)
        except User.DoesNotExist:
            return Response({"error": f"User '{new_username}' does not exist. Check spelling!"}, status=status.HTTP_404_NOT_FOUND)

        # 5. Success! Update the order with bulletproof sender name fallback
        sender_name = getattr(request.user, 'username', '')
        if not sender_name:
            sender_name = getattr(request.user, 'email', str(request.user))
            
        order.transferred_by = sender_name # <-- Safely records who sent the gift
        order.user = new_user
        order.delivery_address = new_address
        order.is_transferred = True
        order.save()

        return Response({"message": f"Order #{order.id} successfully transferred to {new_username}!"}, status=status.HTTP_200_OK)
    

    # --- DELIVERY AGENT VIEWS ---

class DeliveryOrdersView(APIView):
    """Fetches orders that are waiting to be delivered or currently in transit."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Optional: If you strictly enforce roles, uncomment the next two lines:
        # if getattr(request.user, 'role', '') != 'delivery':
        #     return Response({"error": "Access Denied. Delivery agents only."}, status=status.HTTP_403_FORBIDDEN)

        # Fetch orders that the manager has Shipped, or the driver is currently delivering
        orders = Order.objects.filter(delivery_agent=request.user, status__in=['Shipped', 'Out for Delivery']).order_by('created_at')
        
        data = []
        for o in orders:
            # Calculate total dynamically just in case
            order_total = sum([float(item.price_at_purchase) * item.quantity for item in o.items.all()])
            
            data.append({
                "id": o.id,
                "store_name": o.store.name if o.store else "FreshFetch Fulfillment",
                "customer_name": o.user.username,
                "customer_phone": getattr(o.user, 'phone_number', 'Not Provided'),
                "delivery_address": o.delivery_address,
                "status": o.status,
                "total_price": str(round(order_total, 2)),
                "packing_photo": request.build_absolute_uri(o.packing_photo.url) if o.packing_photo else None,
            })
        return Response(data)



class DeliveryUpdateStatusView(APIView):
    """Allows the delivery agent to update the delivery pipeline and upload proof."""
    permission_classes = [IsAuthenticated]
    
    # We need these parsers to accept image files from the delivery app
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            new_status = request.data.get('status')
            
            if new_status in ['Out for Delivery', 'Delivered']:
                order.status = new_status

                # --- NEW: If delivered, save the proof photo! ---
                if new_status == 'Delivered':
                    photo = request.FILES.get('image')
                    if photo:
                        order.delivery_photo = photo
                    else:
                        return Response({"error": "Proof of delivery photo is required!"}, status=status.HTTP_400_BAD_REQUEST)

                order.save()
                return Response({"message": f"Order #{order.id} is now {new_status}!"}, status=status.HTTP_200_OK)
            
            return Response({"error": "Invalid status update."}, status=status.HTTP_400_BAD_REQUEST)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        
class AvailableDeliveryAgentsView(APIView):
    """Dynamically calculates which agents are free and which are busy."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        # Fetch all delivery agents
        agents = User.objects.filter(role__in=['delivery', 'delivery_agent'])
        data = []
        
        for agent in agents:
            # SMART LOGIC: If they hold an active order, they are busy. If not, they are available!
            is_busy = Order.objects.filter(delivery_agent=agent, status__in=['Shipped', 'Out for Delivery']).exists()
            
            data.append({
                "id": agent.id,
                "username": agent.username,
                "status": "Busy with delivery" if is_busy else "Available"
            })
            
        return Response(data)

class AssignDeliveryAgentView(APIView):
    """Allows the manager to assign an available driver to an order."""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        if getattr(request.user, 'role', '') != 'manager':
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            order = Order.objects.get(id=order_id, store=request.user.managed_store)
            agent_id = request.data.get('agent_id')
            
            if not agent_id:
                return Response({"error": "Please select an agent."}, status=status.HTTP_400_BAD_REQUEST)
            
            agent = User.objects.get(id=agent_id)
            order.delivery_agent = agent
            order.save()
            
            return Response({"message": f"Successfully assigned {agent.username} to Order #{order.id}"}, status=status.HTTP_200_OK)
        
        except (Order.DoesNotExist, User.DoesNotExist):
            return Response({"error": "Order or Agent not found."}, status=status.HTTP_404_NOT_FOUND)