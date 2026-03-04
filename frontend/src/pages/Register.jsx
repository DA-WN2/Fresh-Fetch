import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Auth.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "customer",
  });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Note: You'll need to create this endpoint in Django later
      await axios.post(
        "http://127.0.0.1:8000/api/customer/register/",
        formData,
      );
      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      alert("Registration failed. Try a different username.");
    }
  };

  return (
    <div className="checkout-container">
      <div className="payment-gateway">
        <h2>Create Account</h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Username"
            required
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
          />
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />

          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="customer">Customer</option>
            <option value="manager">Store Manager</option>
            <option value="delivery">Delivery Agent</option>
          </select>

          <button type="submit" className="pay-btn">
            Sign Up
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
