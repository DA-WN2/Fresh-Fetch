import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
// Reusing your professional light theme styles
import "../styles/Auth.css";

// Helper function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Configure axios to send credentials
axios.defaults.withCredentials = true;

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const csrfToken = getCookie("csrftoken");

      const res = await axios.post(
        "http://127.0.0.1:8000/api/customer/login/",
        credentials,
        {
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken && { "X-CSRFToken": csrfToken }),
          },
        },
      );

      // 1. Save Identity for the session
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);

      // 2. Role-Based Redirection Logic
      switch (res.data.role) {
        case "manager":
          navigate("/manager-dashboard");
          break;
        case "delivery":
          navigate("/delivery-portal");
          break;
        case "supplier":
          navigate("/supplier-inventory");
          break;
        case "customer":
        default:
          navigate("/"); // Back to Marketplace
          break;
      }
    } catch (err) {
      console.error("Login Error:", err);

      // Provide specific error messages
      let errorMessage = "Invalid username or password. Please try again.";

      if (err.response?.status === 401) {
        errorMessage = "Invalid credentials. Check username and password.";
      } else if (err.response?.status === 400) {
        errorMessage = "Bad request. Please check your input.";
      } else if (err.message === "Network Error" || !err.response) {
        errorMessage = "Network error. Is the server running?";
      }

      setError(err.response?.data?.error || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="payment-gateway">
        <div className="brand">
          <div
            className="brand-badge"
            style={{ backgroundColor: "var(--primary)" }}
          >
            FF
          </div>
          <h2>Fresh-Fetch Login</h2>
        </div>

        <p className="subtitle">
          Enter your credentials to access your dashboard
        </p>

        {error && (
          <div
            className="badge-expiry"
            style={{ position: "static", width: "100%", marginBottom: "1rem" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div
            className="form-group"
            style={{ textAlign: "left", marginBottom: "1.5rem" }}
          >
            <label style={{ fontWeight: "700", color: "var(--text-main)" }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={credentials.username}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          <div
            className="form-group"
            style={{ textAlign: "left", marginBottom: "2rem" }}
          >
            <label style={{ fontWeight: "700", color: "var(--text-main)" }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={credentials.password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          <button
            type="submit"
            className="pay-btn"
            disabled={loading}
            style={{
              background: "var(--primary)",
              color: "white",
              border: "none",
            }}
          >
            {loading ? "Authenticating..." : "Login to Fresh-Fetch"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            fontSize: "0.9rem",
            color: "var(--text-muted)",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{ color: "var(--primary)", fontWeight: "700" }}
          >
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
