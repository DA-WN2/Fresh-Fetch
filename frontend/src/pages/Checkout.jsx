import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "../styles/Marketplace.css";

const Checkout = ({ cart, setCart }) => {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("card");

  // NEW: State for the delivery address
  const [address, setAddress] = useState("");

  const [notification, setNotification] = useState({ text: "", type: "" });
  const navigate = useNavigate();

  const total = cart.reduce(
    (acc, it) =>
      acc + (Number(it.product.current_price) || 0) * (it.quantity || 1),
    0,
  );

  const showNotification = (text, type = "success") => {
    setNotification({ text, type });
    if (type === "error") {
      setTimeout(() => setNotification({ text: "", type: "" }), 3500);
    }
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      showNotification("Your basket is empty!", "error");
      return;
    }

    // NEW: Make sure they actually typed an address!
    if (!address.trim()) {
      showNotification("Please enter a delivery address.", "error");
      return;
    }

    setPaying(true);
    const token = localStorage.getItem("token");

    try {
      const formattedItems = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity || 1,
      }));

      const res = await axios.post(
        "http://127.0.0.1:8000/api/customer/checkout/",
        {
          cart_items: formattedItems,
          delivery_address: address, // NEW: Send the address to Django
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Token ${token}` : "",
          },
        },
      );

      setPaying(false);
      setCart([]);

      showNotification(
        `Payment Successful! ${res.data.store_orders_generated} branch orders have been placed.`,
        "success",
      );

      setTimeout(() => {
        navigate("/orders");
      }, 2500);
    } catch (err) {
      console.error("Payment Error:", err);
      setPaying(false);
      let message = "Payment Failed. Please try again.";
      if (err.response) {
        const { status, data } = err.response;
        if (status === 403 || status === 401)
          message = "Please login to complete purchase.";
        else if (data.error) message = data.error;
      }
      showNotification(message, "error");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    fontFamily: "Inter, sans-serif",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    marginTop: "6px",
  };

  const labelStyle = {
    display: "block",
    fontWeight: "600",
    color: "var(--text-main)",
    fontSize: "0.85rem",
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "3rem auto",
        padding: "0 1.5rem",
        position: "relative",
      }}
    >
      {/* --- CUSTOM NOTIFICATION POPUP --- */}
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
            padding: "16px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            zIndex: 2000,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {notification.type === "error" ? (
            <AlertCircle size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          {notification.text}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "2rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1.5rem",
        }}
      >
        <Lock size={28} color="var(--primary)" />
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.75rem",
              color: "var(--text-main)",
            }}
          >
            Secure Checkout
          </h2>
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ShieldCheck size={14} color="#10b981" /> 256-bit SSL Encryption
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "3rem",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: SHIPPING & PAYMENT FORM */}
        <div
          style={{
            background: "var(--card-bg)",
            padding: "2rem",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
          }}
        >
          {/* NEW: SHIPPING DETAILS SECTION */}
          <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.1rem" }}>
            Shipping Details
          </h3>
          <div style={{ marginBottom: "2rem" }}>
            <label style={labelStyle}>Delivery Address</label>
            <textarea
              placeholder="Enter your full delivery address (e.g., 123 Main St, Apt 4B, City, PIN)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
              required
            />
          </div>

          <h3
            style={{
              margin: "0 0 1.5rem 0",
              fontSize: "1.1rem",
              borderTop: "1px solid var(--border)",
              paddingTop: "1.5rem",
            }}
          >
            Payment Method
          </h3>

          <div style={{ display: "flex", gap: "12px", marginBottom: "2rem" }}>
            {[
              { id: "card", icon: <CreditCard size={18} />, label: "Card" },
              { id: "upi", icon: <Smartphone size={18} />, label: "UPI" },
              { id: "wallet", icon: <Wallet size={18} />, label: "Wallet" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border:
                    method === m.id
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                  background: method === m.id ? "#f0fdfa" : "white",
                  color:
                    method === m.id ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {method === "card" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label style={labelStyle}>Cardholder Name</label>
                <input type="text" placeholder="John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Card Number</label>
                <input
                  type="text"
                  placeholder="4111 2222 3333 4444"
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="text" placeholder="MM/YY" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CVV</label>
                  <input type="password" placeholder="•••" style={inputStyle} />
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "3rem 1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                textAlign: "center",
                border: "1px dashed #cbd5e1",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>
                {method === "upi"
                  ? "Scan QR Code on the next screen to pay via UPI."
                  : "Wallet selection will open in a secure window."}
              </span>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={paying || cart.length === 0}
            style={{
              width: "100%",
              marginTop: "2.5rem",
              padding: "16px",
              borderRadius: "var(--radius-btn)",
              border: "none",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              transition: "0.2s",
              background: cart.length === 0 ? "#cbd5e1" : "var(--primary)",
              color: "white",
              boxShadow:
                cart.length === 0
                  ? "none"
                  : "0 4px 6px -1px rgba(15, 118, 110, 0.2)",
            }}
          >
            {paying
              ? "Processing Transaction..."
              : `Pay ₹${total.toFixed(2)} Securely`}
          </button>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link
              to="/cart"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: "500",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={14} /> Back to Basket
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY */}
        <div
          style={{
            background: "#f8fafc",
            padding: "2rem",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1.5rem 0",
              fontSize: "1.1rem",
              color: "var(--text-main)",
              borderBottom: "1px solid #cbd5e1",
              paddingBottom: "12px",
            }}
          >
            Order Summary
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minHeight: "150px",
            }}
          >
            {cart.length > 0 ? (
              cart.map((it) => (
                <div
                  key={it.product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.95rem",
                    color: "var(--text-main)",
                  }}
                >
                  <span>
                    {it.product.name}{" "}
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      x{it.quantity}
                    </span>
                  </span>
                  <span style={{ fontWeight: "600" }}>
                    ₹
                    {(
                      Number(it.product.current_price) * (it.quantity || 1)
                    ).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                No items to display.
              </p>
            )}
          </div>

          <div
            style={{
              borderTop: "2px dashed #cbd5e1",
              paddingTop: "1.5rem",
              marginTop: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                marginBottom: "8px",
                fontSize: "0.9rem",
              }}
            >
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                marginBottom: "16px",
                fontSize: "0.9rem",
              }}
            >
              <span>Taxes & Fees</span>
              <span>₹0.00</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.3rem",
                fontWeight: "800",
                color: "var(--primary)",
              }}
            >
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
