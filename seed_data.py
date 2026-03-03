import os
import django
from datetime import date, timedelta

# Set up Django context
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') 
django.setup()

from inventory.models import Product, Category

def seed_db():
    # 1. Create Categories
    dairy_cat, _ = Category.objects.get_or_create(name="Dairy")
    produce_cat, _ = Category.objects.get_or_create(name="Produce")
    staples_cat, _ = Category.objects.get_or_create(name="Staples")

    today = date.today()

    products = [
        # Smart Deals (Expiring soon)
        {"name": "Fresh Milk", "cat": dairy_cat, "price": 30.00, "stock": 10, "mfg": today - timedelta(days=5), "exp": today + timedelta(days=2)},
        {"name": "Whole Wheat Bread", "cat": produce_cat, "price": 40.00, "stock": 15, "mfg": today - timedelta(days=3), "exp": today + timedelta(days=1)},

        # Standard Inventory
        {"name": "Basmati Rice 1kg", "cat": staples_cat, "price": 120.00, "stock": 50, "mfg": today - timedelta(days=30), "exp": today + timedelta(days=365)},
        {"name": "Cheddar Cheese", "cat": dairy_cat, "price": 85.00, "stock": 25, "mfg": today - timedelta(days=10), "exp": today + timedelta(days=45)},
        {"name": "Apples 1kg", "cat": produce_cat, "price": 150.00, "stock": 3, "mfg": today - timedelta(days=2), "exp": today + timedelta(days=14)}, # Triggers low stock alert
    ]

    for p in products:
        prod, created = Product.objects.get_or_create(
            name=p["name"],
            category=p["cat"],
            defaults={
                "original_price": p["price"],
                "current_price": p["price"],
                "stock_quantity": p["stock"],
                "manufactured_date": p["mfg"],
                "expiry_date": p["exp"]
            }
        )
        # Run your custom logic to set near_expiry and smart pricing
        prod.check_and_update_smart_pricing()
        print(f"Added/Updated: {prod.name}")

if __name__ == "__main__":
    seed_db()
    print("Database seeding complete!")