import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import "../styles/Marketplace.css"; // Inherit our new global variables

const Cart = ({ cart, removeFromCart }) => {
  const navigate = useNavigate();

  const total = cart.reduce(
    (acc, item) => acc + parseFloat(item.product.current_price) * item.quantity,
    0,
  );

  return (
    <div
      style={{ maxWidth: "800px", margin: "3rem auto", padding: "0 1.5rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "2rem",
        }}
      >
        <ShoppingBag size={28} color="var(--primary)" />
        <h2
          style={{ margin: 0, fontSize: "1.75rem", color: "var(--text-main)" }}
        >
          Your Basket
        </h2>
      </div>

      {cart.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--card-bg)",
            borderRadius: "var(--radius-card)",
            border: "1px dashed var(--border)",
          }}
        >
          <ShoppingBag
            size={48}
            color="#cbd5e1"
            style={{ marginBottom: "1rem" }}
          />
          <h3 style={{ color: "var(--text-main)", margin: "0 0 0.5rem 0" }}>
            Your basket is empty
          </h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            Looks like you haven't added any items yet.
          </p>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              background: "var(--primary)",
              color: "white",
              padding: "10px 20px",
              borderRadius: "var(--radius-btn)",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ArrowLeft size={16} /> Return to Shop
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            padding: "2rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {cart.map((item) => (
              <div
                key={item.product.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1.5rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "24px",
                    }}
                  >
                    🛒
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "1.1rem",
                        color: "var(--text-main)",
                      }}
                    >
                      {item.product.name}
                    </h4>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                        fontWeight: "500",
                      }}
                    >
                      Qty: {item.quantity} × ₹{item.product.current_price}
                    </span>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "2rem" }}
                >
                  <strong
                    style={{ fontSize: "1.25rem", color: "var(--text-main)" }}
                  >
                    ₹
                    {(
                      parseFloat(item.product.current_price) * item.quantity
                    ).toFixed(2)}
                  </strong>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    style={{
                      background: "#fee2e2",
                      color: "var(--danger)",
                      border: "none",
                      padding: "8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "0.2s",
                    }}
                    title="Remove Item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <Link
              to="/"
              style={{
                textDecoration: "none",
                color: "var(--text-muted)",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={16} /> Continue Shopping
            </Link>

            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: "0 0 8px 0",
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                }}
              >
                Subtotal (incl. taxes)
              </p>
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  fontSize: "2rem",
                  color: "var(--primary)",
                  fontWeight: "700",
                }}
              >
                ₹{total.toFixed(2)}
              </h3>
              <button
                onClick={() => navigate("/checkout")}
                style={{
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  padding: "12px 32px",
                  borderRadius: "var(--radius-btn)",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(15, 118, 110, 0.2)",
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
