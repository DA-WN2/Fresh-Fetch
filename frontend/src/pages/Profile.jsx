import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Profile.css";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [transferCount, setTransferCount] = useState(0); // NEW: State for transfer notifications
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const headers = {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    };

    // Use Promise.all to fetch profile and orders (to check for transfers) simultaneously
    Promise.all([
      axios.get("http://127.0.0.1:8000/api/customer/profile/", { headers }),
      axios.get("http://127.0.0.1:8000/api/customer/my-orders/", { headers }),
    ])
      .then(([profileRes, ordersRes]) => {
        setProfile(profileRes.data);

        // Use Case: Filter orders where the user is the recipient of a transfer
        const receivedOrders = ordersRes.data.filter(
          (order) => order.is_received,
        );
        setTransferCount(receivedOrders.length);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setError("Failed to load account data.");
        setLoading(false);
      });
  }, [navigate]);

  if (loading)
    return (
      <div className="profile-container">
        <div className="status-msg">Loading secure profile...</div>
      </div>
    );
  if (error)
    return (
      <div className="profile-container">
        <div className="status-msg error">{error}</div>
      </div>
    );

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>My Account</h2>
        <p className="logic-hint">
          Manage your personal information and preferences.
        </p>
      </div>

      {/* NEW: Use Case - Third-Party Access Notification Banner */}
      {transferCount > 0 && (
        <div className="profile-notification-banner">
          <div className="banner-text">
            <span>🎁</span>
            <strong>Transfer Alert:</strong> You have {transferCount} new
            order(s) shared with your account!
          </div>
          <Link to="/orders" className="banner-link">
            View Orders →
          </Link>
        </div>
      )}

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            {profile.username.charAt(0).toUpperCase()}
          </div>

          <div className="profile-details">
            <div className="detail-group">
              <label>Username</label>
              <p className="detail-value">{profile.username}</p>
            </div>

            <div className="detail-group">
              <label>Email Address</label>
              <p className="detail-value">{profile.email}</p>
            </div>

            <div className="detail-group">
              <label>Account Type</label>
              <p className="detail-value role-badge">
                {profile.role.toUpperCase()}
              </p>
            </div>

            {profile.date_joined && (
              <div className="detail-group">
                <label>Member Since</label>
                <p className="detail-value">
                  {new Date(profile.date_joined).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links / Actions */}
        <div className="profile-actions-card">
          <h3>Quick Links</h3>
          <Link to="/orders" className="action-btn">
            📦 View Order History
          </Link>
          <Link to="/cart" className="action-btn">
            🛒 Go to Basket
          </Link>
          <button
            className="action-btn logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
              window.location.reload();
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
