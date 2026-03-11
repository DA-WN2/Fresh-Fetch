import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Auth.css";

const Register = () => {
  // SECURITY FIX: Removed 'role' from state. The backend automatically defaults to 'customer'.
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors before trying again

    try {
      await axios.post(
        "http://127.0.0.1:8000/api/customer/register/",
        formData,
      );
      alert("Registration successful! You can now log in.");
      navigate("/login");
    } catch (err) {
      console.error("Registration Error:", err);
      // Show a specific error from the Django backend if it exists
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Registration failed. Please try a different username.");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Fresh-Fetch to start shopping</p>

        {/* Dynamic Error Message Display */}
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

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="auth-input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>

          <div className="auth-input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <button type="submit" className="auth-btn">
            Sign Up
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
