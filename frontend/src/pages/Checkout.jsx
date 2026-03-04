import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Checkout.css";

const Checkout = ({ cart, setCart }) => {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("card");
  const navigate = useNavigate();

  // FIX: Ensure prices are treated as Numbers to avoid concatenation errors
  const total = cart.reduce(
    (acc, it) => acc + (Number(it.current_price) || 0) * (it.quantity || 1),
    0,
  );

  const handlePayment = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    setPaying(true);
    const token = localStorage.getItem("token");

    try {
      // FIX: Removed setTimeout. Real apps should call the API immediately.
      const res = await axios.post(
        "http://127.0.0.1:8000/api/customer/place-order/",
        { items: cart },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Token ${token}` : "",
          },
        },
      );

      setPaying(false);
      setCart([]); // Clear global cart state
      alert("Payment Successful! Your order has been placed.");
      navigate("/orders");
    } catch (err) {
      console.error("Payment Error:", err);
      setPaying(false);

      let message = "Payment Failed. Please try again.";
      if (err.response) {
        const { status, data } = err.response;
        if (status === 403) message = "Please login to complete purchase.";
        else if (data.error) message = data.error;
      }
      alert(message);
    }
  };

  return (
    <div className="checkout-container">
      <div className="payment-gateway">
        {/* Header Section */}
        <div
          className="brand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "2rem",
          }}
        >
          <div
            className="brand-badge"
            style={{
              background: "var(--primary)",
              color: "white",
              padding: "10px 15px",
              borderRadius: "8px",
              fontWeight: "800",
            }}
          >
            FF
          </div>
          <div style={{ textAlign: "left" }}>
            <h2 style={{ margin: 0, color: "var(--text-main)" }}>
              Secure Checkout
            </h2>
            <small style={{ color: "var(--text-muted)" }}>
              🔒 Verified 256-bit Encryption
            </small>
          </div>
        </div>

        <div
          className="checkout-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: "40px",
          }}
        >
          {/* Payment Form */}
          <div className="checkout-form">
            <div
              className="payment-methods"
              style={{ display: "flex", gap: "10px", marginBottom: "2rem" }}
            >
              {["card", "upi", "wallet"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: method === m ? "var(--primary)" : "white",
                    color: method === m ? "white" : "var(--text-main)",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "0.3s",
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {method === "card" ? (
              <div style={{ textAlign: "left" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "5px",
                    }}
                  >
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "5px",
                    }}
                  >
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="xxxx xxxx xxxx xxxx"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "15px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: "700",
                        marginBottom: "5px",
                      }}
                    >
                      Expiry
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: "700",
                        marginBottom: "5px",
                      }}
                    >
                      CVV
                    </label>
                    <input
                      type="password"
                      placeholder="***"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "40px",
                  background: "#f1f5f9",
                  borderRadius: "12px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {method === "upi"
                  ? "Scan QR Code on the next screen..."
                  : "Wallet selection will open in a new window..."}
              </div>
            )}

            <button
              className="pay-btn"
              onClick={handlePayment}
              disabled={paying || cart.length === 0}
              style={{
                width: "100%",
                marginTop: "2rem",
                padding: "15px",
                background: cart.length === 0 ? "#ccc" : "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "800",
                cursor: cart.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {paying
                ? "Processing Transaction..."
                : `Confirm & Pay ₹${total.toFixed(2)}`}
            </button>

            <Link
              to="/cart"
              style={{
                display: "block",
                marginTop: "1rem",
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              ← Return to Cart
            </Link>
          </div>

          {/* Order Summary Sidebar */}
          <aside
            className="checkout-summary"
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "20px",
              border: "1px solid var(--border)",
              alignSelf: "start",
            }}
          >
            <h3
              style={{
                borderBottom: "1px solid var(--border)",
                paddingBottom: "10px",
                marginBottom: "15px",
                textAlign: "left",
              }}
            >
              Order Summary
            </h3>
            {cart.length > 0 ? (
              cart.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    fontSize: "0.95rem",
                  }}
                >
                  <span>
                    {it.name}{" "}
                    <small style={{ color: "#888" }}>
                      (x{it.quantity || 1})
                    </small>
                  </span>
                  <span style={{ fontWeight: "700" }}>
                    ₹
                    {(Number(it.current_price) * (it.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No items in summary.
              </p>
            )}

            <div
              style={{
                borderTop: "2px solid var(--border)",
                marginTop: "15px",
                paddingTop: "15px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.2rem",
                fontWeight: "800",
                color: "var(--primary)",
              }}
            >
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
