import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Orders.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No auth token found");
      setLoading(false);
      return;
    }

    // Fetching from your Django backend API with auth header
    axios
      .get("http://127.0.0.1:8000/api/customer/my-orders/", {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching orders:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="orders-page-container">
      <div className="header-flex">
        <h2>Your Purchase History</h2>
        <span className="order-count">{orders.length} Orders Found</span>
      </div>

      {loading ? (
        <div className="status-msg">Accessing secure order records...</div>
      ) : orders.length === 0 ? (
        <div className="status-msg">
          <p>No orders found in your history.</p>
          <small>Completed transactions will appear here automatically.</small>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-id-group">
                  <span className="order-label">Order ID</span>
                  <span className="order-number">#{order.id}</span>
                </div>
                <span className="order-date">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="order-body">
                <p className="order-status">
                  Status:{" "}
                  <span className={`status-pill ${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </p>

                {/* USE CASE 4: Logistics Priority Logic */}
                <div
                  className={`logistics-priority ${order.is_express ? "express" : "standard"}`}
                >
                  <span className="icon">{order.is_express ? "🚀" : "📦"}</span>
                  <div className="priority-text">
                    <p className="priority-label">Delivery Priority</p>
                    <p className="priority-value">
                      {order.is_express
                        ? "EXPRESS - Priority Cold-Chain"
                        : "STANDARD - Routine Delivery"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
