import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css"

const Navbar = ({ cartCount, fetchData }) => {
  const navigate = useNavigate();
  
  // Retrieve auth data for Role-Based UI
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.clear(); // Wipe session
    navigate('/login');
    window.location.reload(); // Refresh to update UI states
  };

  return (
    <header className="main-header">
      <Link to="/" className="logo-section" style={{ textDecoration: "none" }}>
        <h1>Fresh-Fetch</h1>
        <p className="subtitle">Smart Grocery Solutions</p>
      </Link>

      <nav className="nav-menu">
        <Link to="/" className="nav-link">Shop</Link>
        
        {/* If logged in, show personalized links and Logout */}
        {token ? (
          <>
            <Link to="/orders" className="nav-link">My Orders</Link>
            {role === 'manager' && (
              <Link to="/manager-dashboard" className="nav-link" style={{color: 'var(--primary)'}}>Dashboard</Link>
            )}
            <span className="nav-link" style={{ fontWeight: "700" }}>Hi, {username}</span>
            <button className="refresh-btn" onClick={handleLogout} title="Logout">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            {/* <Link to="/register" className="nav-link">Register</Link> */}
          </>
        )}

        <Link to="/cart" className="cart-btn">
          🛒 Basket ({cartCount})
        </Link>
        
        <button className="refresh-btn" onClick={fetchData}>🔄</button>
      </nav>
    </header>
  );
};

export default Navbar;