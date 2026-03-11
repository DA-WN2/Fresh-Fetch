import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
// Using the dedicated authentication styles
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
      const userRole = res.data.role;
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", userRole);
      localStorage.setItem("username", res.data.username);

      // 2. SMART Role-Based Redirection Logic
      // This catches 'delivery_agent' exactly as you typed it in the Django Admin!
      if (userRole === "manager") {
        navigate("/manager-dashboard");
      } else if (userRole === "delivery" || userRole === "delivery_agent") {
        navigate("/delivery-portal");
      } else if (userRole === "supplier") {
        navigate("/supplier-inventory");
      } else {
        navigate("/"); // Normal customers go to the Marketplace
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
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to your Fresh-Fetch account</p>

        {error && (
          <div
            style={{
              background: "#ffeaa7",
              color: "#d35400",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-input-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={credentials.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
