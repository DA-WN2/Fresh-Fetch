import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Checkout.css";

const Checkout = ({ cart, setCart }) => {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("card");
  const navigate = useNavigate();

  const total = cart.reduce(
    (acc, it) => acc + Number(it.current_price || 0),
    0,
  );

  const handlePayment = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    setPaying(true);

    setTimeout(async () => {
      try {
        const res = await axios.post(
          "http://127.0.0.1:8000/api/customer/place-order/",
          { items: cart },
          { headers: { "Content-Type": "application/json" } },
        );

        // success
        setPaying(false);
        setCart([]);
        alert("Payment Successful! Inventory updated in MySQL.");
        navigate("/orders");
      } catch (err) {
        // Better error reporting for debugging
        console.error("Payment Error:", err);
        let message = "Payment Failed. Please try again.";
        if (err.response) {
          // Server responded with non-2xx
          const status = err.response.status;
          const data = err.response.data;
          message =
            `Payment failed (status ${status})` +
            (data?.detail ? `: ${data.detail}` : "");
        } else if (err.request) {
          // Request made but no response
          message = "No response from server. Is the backend running?";
        } else if (err.message) {
          message = err.message;
        }
        alert(message);
        setPaying(false);
      }
    }, 1800);
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <div className="brand">
          <div className="brand-badge">FF</div>
          <div>
            <h2>Secure Payment Gateway</h2>
            <div className="checkout-note">
              🔒 256-bit third-party encryption enabled
            </div>
          </div>
        </div>
        <div className="checkout-actions">
          <Link to="/cart" className="pm-tab">
            Back to Cart
          </Link>
        </div>
      </div>

      <div className="accent-line" />

      <div className="checkout-grid">
        <div className="checkout-form">
          <div className="payment-methods">
            <div
              className={`pm-tab ${method === "card" ? "active" : ""}`}
              onClick={() => setMethod("card")}
            >
              Card
            </div>
            <div
              className={`pm-tab ${method === "upi" ? "active" : ""}`}
              onClick={() => setMethod("upi")}
            >
              UPI
            </div>
            <div
              className={`pm-tab ${method === "wallet" ? "active" : ""}`}
              onClick={() => setMethod("wallet")}
            >
              Wallet
            </div>
          </div>

          {method === "card" && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Name on Card</label>
                  <input type="text" placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry</label>
                  <input type="text" placeholder="MM/YY" />
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input type="password" placeholder="***" />
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="pay-btn"
                  onClick={handlePayment}
                  disabled={paying}
                >
                  {paying ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
                </button>
              </div>
            </>
          )}

          {method === "upi" && (
            <div className="checkout-note">
              Scan this QR with your UPI app to pay (mock)
            </div>
          )}

          {method === "wallet" && (
            <div className="checkout-note">
              Choose your wallet and confirm the payment (mock)
            </div>
          )}
        </div>

        <aside className="checkout-summary">
          <div className="summary-title">Order Summary</div>
          {cart.length === 0 ? (
            <div className="checkout-note">Your cart is empty.</div>
          ) : (
            cart.map((it) => (
              <div className="summary-item" key={it.cartId || it.id}>
                {it.image ? (
                  <img src={it.image} alt={it.name} />
                ) : (
                  <img src="/placeholder-56.png" alt="item" />
                )}
                <div className="meta">
                  <strong>{it.name}</strong>
                  <small>Qty: {it.quantity || 1}</small>
                </div>
                <div style={{ marginLeft: "auto", fontWeight: 800 }}>
                  ₹{Number(it.current_price).toFixed(2)}
                </div>
              </div>
            ))
          )}

          <div className="summary-row">
            <div className="note"></div>
            <div />
          </div>

          <div className="total">
            <div>Total</div>
            <div>₹{total.toFixed(2)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
