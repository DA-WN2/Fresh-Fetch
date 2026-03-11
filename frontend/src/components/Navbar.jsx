import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  LogOut,
  LayoutDashboard,
  User,
  Package,
} from "lucide-react";

// NEW: Added clearCart to the props
const Navbar = ({ cartCount, clearCart }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");

  const handleLogout = () => {
    // 1. Wipe local storage
    localStorage.clear();
    localStorage.removeItem("freshfetch_cart"); // Redundant if clear() is used, but safe to keep!

    // 2. NEW: Instantly wipe the live React cart state so the icon resets to 0!
    if (clearCart) {
      clearCart();
    }

    // 3. Send to login
    navigate("/login");
  };

  return (
    <nav
      style={{
        backgroundColor: "white",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 2rem",
          height: "70px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* LOGO */}
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              background: "#0f766e",
              color: "white",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Package size={20} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "#0f172a",
              letterSpacing: "-0.5px",
            }}
          >
            Fresh<span style={{ color: "#0f766e" }}>Fetch.</span>
          </h1>
        </Link>

        {/* NAVIGATION LINKS */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#475569",
              fontWeight: "500",
              fontSize: "0.95rem",
              transition: "color 0.2s",
            }}
          >
            Shop
          </Link>

          {token && (
            <>
              <Link
                to="/orders"
                style={{
                  textDecoration: "none",
                  color: "#475569",
                  fontWeight: "500",
                  fontSize: "0.95rem",
                }}
              >
                My Orders
              </Link>
              {role === "manager" && (
                <Link
                  to="/manager-dashboard"
                  style={{
                    textDecoration: "none",
                    color: "#0f766e",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
              )}
            </>
          )}
        </div>

        {/* ACTIONS (Cart & Auth) */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            to="/cart"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#f1f5f9",
              color: "#0f172a",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "0.9rem",
              transition: "background 0.2s",
            }}
          >
            <ShoppingBag size={18} color="#0f766e" />
            Basket{" "}
            <span
              style={{
                backgroundColor: "#0f766e",
                color: "white",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                marginLeft: "4px",
              }}
            >
              {cartCount}
            </span>
          </Link>

          {token ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                borderLeft: "1px solid #e2e8f0",
                paddingLeft: "1rem",
              }}
            >
              <Link
                to="/profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#475569",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                <User size={18} /> {username}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "#0f766e",
                fontWeight: "600",
                fontSize: "0.95rem",
                marginLeft: "1rem",
              }}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
