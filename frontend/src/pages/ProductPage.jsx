import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ShoppingCart,
  Calendar,
  ShieldCheck,
  Store,
  Star,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
} from "lucide-react";
import "../styles/Marketplace.css";

const ProductPage = ({ addToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/products/${id}/`,
        );
        setProduct(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching product", err);
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading)
    return <div className="status-msg">Loading Product Details...</div>;
  if (!product) return <div className="status-msg">Product not found.</div>;

  const handleIncrement = () => {
    if (quantity < product.stock_quantity) setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setNotification(`${quantity}x ${product.name} added to cart!`);
    setTimeout(() => setNotification(""), 3000);
    setQuantity(1);
  };

  return (
    /* FIXED: Added paddingTop: 40px to prevent the Navbar from overlapping! */
    <div
      className="home-container"
      style={{ paddingBottom: "100px", paddingTop: "40px" }}
    >
      {/* NOTIFICATION POPUP - Fixed Color */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "90px",
            right: "32px",
            background: "var(--primary)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            zIndex: 2000,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={18} /> {notification}
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="pill"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "32px",
          border: "1px solid var(--border)",
          background: "white",
          color: "var(--text-main)",
          padding: "8px 16px",
        }}
      >
        <ArrowLeft size={16} /> Back to Shop
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px",
          alignItems: "start",
        }}
      >
        {/* LEFT: IMAGE SECTION */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "var(--radius-card)",
            padding: "60px",
            display: "flex",
            justifyContent: "center",
            border: "1px solid var(--border)",
            position: "relative",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "120px" }}>🛒</span>
          {product.is_near_expiry && (
            <div
              className="badge-expiry"
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                margin: 0,
              }}
            >
              SMART DEAL: 30% OFF
            </div>
          )}
        </div>

        {/* RIGHT: DETAILS SECTION */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-muted)",
              fontWeight: "bold",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            <Store size={16} /> {product.store_name} • {product.category_name}
          </div>

          <h1
            style={{
              fontSize: "36px",
              color: "var(--text-main)",
              margin: "0 0 16px 0",
              letterSpacing: "-0.5px",
            }}
          >
            {product.name}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", color: "#f59e0b" }}>
              <Star size={18} fill="#f59e0b" color="#f59e0b" />{" "}
              <Star size={18} fill="#f59e0b" color="#f59e0b" />{" "}
              <Star size={18} fill="#f59e0b" color="#f59e0b" />{" "}
              <Star size={18} fill="#f59e0b" color="#f59e0b" />{" "}
              <Star size={18} color="#cbd5e1" />
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              (12 verified reviews)
            </span>
          </div>

          <div className="price-container" style={{ marginBottom: "32px" }}>
            <span className="current-price" style={{ fontSize: "42px" }}>
              ₹{product.current_price}
            </span>
            {product.is_near_expiry && (
              <span
                className="old-price"
                style={{ fontSize: "20px", marginLeft: "12px" }}
              >
                ₹{product.original_price}
              </span>
            )}
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "18px",
                marginLeft: "8px",
              }}
            >
              / {product.unit || "unit"}
            </span>
          </div>

          <p
            style={{
              color: "var(--text-muted)",
              lineHeight: "1.6",
              fontSize: "16px",
              marginBottom: "32px",
            }}
          >
            {product.description ||
              "Freshly sourced and quality checked by our branch managers. Guaranteed premium quality."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                padding: "16px",
                backgroundColor: "var(--card-bg)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
              }}
            >
              <small
                style={{
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  fontSize: "10px",
                  fontWeight: "bold",
                  letterSpacing: "0.5px",
                }}
              >
                Manufactured
              </small>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  color: "var(--text-main)",
                }}
              >
                <Calendar size={16} color="var(--primary)" />{" "}
                {product.manufactured_date}
              </div>
            </div>
            <div
              style={{
                padding: "16px",
                backgroundColor: product.is_near_expiry
                  ? "#fffbeb"
                  : "var(--card-bg)",
                borderRadius: "12px",
                border: product.is_near_expiry
                  ? "1px solid #fde68a"
                  : "1px solid var(--border)",
              }}
            >
              <small
                style={{
                  color: product.is_near_expiry
                    ? "#b45309"
                    : "var(--text-muted)",
                  display: "block",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                  fontSize: "10px",
                  fontWeight: "bold",
                  letterSpacing: "0.5px",
                }}
              >
                Expiry Date
              </small>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  color: product.is_near_expiry
                    ? "#b45309"
                    : "var(--text-main)",
                }}
              >
                <Clock
                  size={16}
                  color={product.is_near_expiry ? "#b45309" : "var(--primary)"}
                />{" "}
                {product.expiry_date}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                color: "var(--text-muted)",
                fontWeight: "bold",
                fontSize: "12px",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Select Quantity
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={handleDecrement}
                  disabled={product.stock_quantity <= 0}
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    border: "none",
                    borderRight: "1px solid var(--border)",
                    cursor: "pointer",
                    color: "var(--text-main)",
                  }}
                >
                  <Minus size={16} />
                </button>
                <span
                  style={{
                    padding: "0 20px",
                    fontWeight: "bold",
                    color: "var(--text-main)",
                    minWidth: "20px",
                    textAlign: "center",
                    fontSize: "16px",
                  }}
                >
                  {product.stock_quantity <= 0 ? 0 : quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={product.stock_quantity <= 0}
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    border: "none",
                    borderLeft: "1px solid var(--border)",
                    cursor: "pointer",
                    color: "var(--text-main)",
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <span
                style={{
                  fontSize: "14px",
                  color:
                    product.stock_quantity <= 5 ? "var(--danger)" : "#10b981",
                  fontWeight: "600",
                }}
              >
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} available in branch`
                  : "Currently Out of Stock"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <button
              className="add-btn"
              onClick={handleAddToCart}
              disabled={product.stock_quantity <= 0}
              style={{
                flex: 1,
                padding: "18px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "12px",
                fontSize: "16px",
                borderRadius: "12px",
              }}
            >
              <ShoppingCart size={20} />{" "}
              {product.stock_quantity <= 0 ? "Out of Stock" : "Add to Basket"}
            </button>
            {/* FIXED COLOR: Go to Cart is now Teal! */}
            <button
              onClick={() => navigate("/cart")}
              style={{
                flex: 1,
                background: "white",
                border: "2px solid var(--primary)",
                color: "var(--primary)",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
            >
              <ShoppingBag size={20} /> Go to Checkout
            </button>
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#10b981",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            <ShieldCheck size={18} /> Verified by Fresh-Fetch Quality Standards
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
