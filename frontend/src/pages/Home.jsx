import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Store,
  ShoppingBag,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import "../styles/Marketplace.css";

const Home = ({ addToCart, cart, clearCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // UPGRADED: Notification now handles both text and type (success/error)
  const [notification, setNotification] = useState({ text: "", type: "" });
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/products/");
        setProducts(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load products", err);
        showNotification("Failed to load products. Please refresh.", "error");
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    "All",
    ...new Set(products.map((p) => p.category_name || p.category || "General")),
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const catName = product.category_name || product.category || "General";
      const matchesCategory =
        activeCategory === "All" || catName === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const deals = filteredProducts.filter((p) => p.is_near_expiry);
  const regularItems = filteredProducts.filter((p) => !p.is_near_expiry);

  const handleAdd = (product) => {
    addToCart(product);
    showNotification(`${product.name} added to cart!`, "success");
  };

  // UPGRADED: Friendly UI notification function instead of alert()
  const showNotification = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: "" }), 3000);
  };

  const cartTotal = cart.reduce(
    (total, item) =>
      total + parseFloat(item.product.current_price) * item.quantity,
    0,
  );

  // THE FIX: Simply route to the checkout page!
  const handleCheckoutRoute = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Please login to proceed to checkout.", "error");
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    // Close the cart modal and send them to the new checkout screen
    setIsCartOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      {/* FLOATING CART BUTTON */}
      <div
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setIsCartOpen(true)}
          style={{
            background: "var(--primary)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "50px",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(15, 118, 110, 0.4)",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            transition: "all 0.2s",
          }}
        >
          <ShoppingBag size={20} /> View Basket (
          {cart.reduce((acc, item) => acc + item.quantity, 0)})
        </button>
      </div>

      {/* UPGRADED NOTIFICATION POPUP */}
      {notification.text && (
        <div
          style={{
            position: "fixed",
            top: "90px",
            right: "32px",
            background:
              notification.type === "error"
                ? "var(--danger)"
                : "var(--primary)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            zIndex: 4000,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {notification.type === "error" ? (
            <AlertTriangle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          {notification.text}
        </div>
      )}

      <main className="home-container">
        <section className="filter-toolbar">
          <input
            type="text"
            className="search-bar"
            placeholder="🔍 Search for groceries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="category-pills">
            {categories.map((cat, index) => (
              <button
                key={index}
                className={`pill ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {deals.length > 0 && (
          <section className="section-deals">
            <h2>🔥 Today's Smart Deals</h2>
            <p className="logic-hint">
              Automated 30% discounts based on shelf-life tracking.
            </p>
            <div className="product-grid">
              {deals.map((item) => (
                <div key={item.id} className="card deal-card">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      className="badge-expiry"
                      style={{ alignSelf: "flex-start", margin: 0 }}
                    >
                      NEAR EXPIRY - 30% OFF
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--text-muted)",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      >
                        <Store size={12} /> {item.store_name}
                      </div>
                      <button
                        onClick={() => navigate(`/product/${item.id}`)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Eye size={12} /> View Details
                      </button>
                    </div>
                  </div>

                  <h3
                    onClick={() => navigate(`/product/${item.id}`)}
                    style={{ cursor: "pointer", marginTop: 0 }}
                  >
                    {item.name}
                  </h3>
                  <div className="price-container">
                    <span className="current-price">₹{item.current_price}</span>
                    <span className="old-price">₹{item.original_price}</span>
                  </div>
                  <button className="add-btn" onClick={() => handleAdd(item)}>
                    Add to Basket
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section-all">
          <h2>Standard Inventory</h2>
          <div className="product-grid">
            {loading ? (
              <div className="status-msg">
                Connecting to Branch Databases...
              </div>
            ) : regularItems.length > 0 ? (
              regularItems.map((item) => (
                <div key={item.id} className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--text-muted)",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      <Store size={12} /> {item.store_name}
                    </div>
                    <button
                      onClick={() => navigate(`/product/${item.id}`)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary)",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      Details
                    </button>
                  </div>
                  <h3
                    onClick={() => navigate(`/product/${item.id}`)}
                    style={{ cursor: "pointer", marginTop: 0 }}
                  >
                    {item.name}
                  </h3>
                  <div className="price-container">
                    <span className="current-price">₹{item.current_price}</span>
                  </div>
                  {item.stock_quantity <= 0 ? (
                    <button className="add-btn out-of-stock" disabled>
                      Out of Stock
                    </button>
                  ) : (
                    <button className="add-btn" onClick={() => handleAdd(item)}>
                      Add to Basket
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="status-msg">No products found.</div>
            )}
          </div>
        </section>
      </main>

      {/* Cart Modal */}
      {isCartOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "400px",
            backgroundColor: "white",
            boxShadow: "-5px 0 25px rgba(0,0,0,0.1)",
            zIndex: 3000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{ margin: 0, fontSize: "20px", color: "var(--text-main)" }}
            >
              <ShoppingBag /> Basket
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              &times;
            </button>
          </div>
          <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
            {cart.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
                Basket is empty.
              </p>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "12px",
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, color: "var(--text-main)" }}>
                      {item.product.name}
                    </h4>
                    <small style={{ color: "var(--text-muted)" }}>
                      {item.product.store_name} • Qty: {item.quantity}
                    </small>
                  </div>
                  <strong style={{ color: "var(--text-main)" }}>
                    ₹
                    {(
                      parseFloat(item.product.current_price) * item.quantity
                    ).toFixed(2)}
                  </strong>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div
              style={{
                padding: "24px",
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--bg-main)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "var(--text-main)",
                  marginBottom: "16px",
                }}
              >
                <span>Total:</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckoutRoute} // <-- THE NEW FUNCTION
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Checkout Securely
              </button>
            </div>
          )}
        </div>
      )}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            zIndex: 2500,
          }}
        />
      )}
    </>
  );
};

export default Home;
