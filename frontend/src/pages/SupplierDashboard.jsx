import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Package,
  CheckCircle2,
  Truck,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const SupplierDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // State to hold the expiry dates typed in by the supplier
  const [expiryDates, setExpiryDates] = useState({});

  // Custom In-App Messaging State
  const [appMessage, setAppMessage] = useState({ text: "", type: "" });

  const navigate = useNavigate();

  // Helper function to show messages and auto-hide them after 4 seconds
  const showMessage = (text, type = "error") => {
    setAppMessage({ text, type });
    setTimeout(() => {
      setAppMessage({ text: "", type: "" });
    }, 4000);
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/supplier/orders/",
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load supplier orders", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [navigate]);

  const handleExpiryChange = (orderId, dateValue) => {
    setExpiryDates((prev) => ({ ...prev, [orderId]: dateValue }));
  };

  const updateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem("token");

    // Prepare the payload
    const payload = { status: newStatus };

    // If delivering, strictly enforce that they provide the batch expiry date!
    if (newStatus === "Delivered") {
      const selectedDate = expiryDates[orderId];
      if (!selectedDate) {
        showMessage(
          "Please select the Expiry Date printed on this batch before confirming delivery.",
          "error",
        );
        return;
      }
      payload.expiry_date = selectedDate;
    }

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/supplier/update-order/${orderId}/`,
        payload,
        { headers: { Authorization: `Token ${token}` } },
      );

      // Show success message
      showMessage(`Order #${orderId} marked as ${newStatus}!`, "success");
      fetchOrders(); // Refresh table
    } catch (err) {
      // Show error message
      showMessage(
        err.response?.data?.error ||
          "Failed to update status. Please check server logs.",
        "error",
      );
    }
  };

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontWeight: "bold",
          color: "#1e1b4b",
        }}
      >
        Loading Vendor Portal...
      </div>
    );

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* IN-APP NOTIFICATION BANNER */}
      {appMessage.text && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor:
              appMessage.type === "error" ? "#fee2e2" : "#d1fae5",
            color: appMessage.type === "error" ? "#ef4444" : "#10b981",
            border: `1px solid ${appMessage.type === "error" ? "#fca5a5" : "#6ee7b7"}`,
            padding: "12px 24px",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "bold",
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          {appMessage.type === "error" ? (
            <AlertTriangle size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          {appMessage.text}
        </div>
      )}

      {/* HEADER */}
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "white",
          padding: "1.5rem 3rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Package size={32} color="#10b981" />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: "900",
                letterSpacing: "0.5px",
              }}
            >
              Fresh-Fetch.
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "#818cf8",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: "600",
              }}
            >
              Vendor Portal
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            color: "white",
            padding: "8px 16px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          <LogOut size={16} /> Exit Portal
        </button>
      </div>

      {/* CONTENT */}
      <div
        style={{ maxWidth: "1000px", margin: "3rem auto", padding: "0 1.5rem" }}
      >
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ margin: "0 0 1.5rem 0", color: "#0f172a" }}>
            Incoming Restock Requests
          </h2>

          {orders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              <CheckCircle2
                size={48}
                color="#10b981"
                style={{ marginBottom: "1rem" }}
              />
              <h3 style={{ margin: 0, color: "#334155" }}>
                No pending requests.
              </h3>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #e2e8f0",
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontSize: "0.85rem",
                  }}
                >
                  <th style={{ padding: "12px" }}>Order ID</th>
                  <th style={{ padding: "12px" }}>Destination</th>
                  <th style={{ padding: "12px" }}>Product Requested</th>
                  <th style={{ padding: "12px" }}>Target Date</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td
                      style={{
                        padding: "16px 12px",
                        fontWeight: "bold",
                        color: "#0f172a",
                      }}
                    >
                      #{order.id}
                    </td>
                    <td style={{ padding: "16px 12px", color: "#475569" }}>
                      {order.store_name}
                    </td>
                    <td
                      style={{
                        padding: "16px 12px",
                        color: "#0f172a",
                        fontWeight: "600",
                      }}
                    >
                      {order.product_name}
                      <span
                        style={{
                          color: "#3b82f6",
                          background: "#eff6ff",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          marginLeft: "8px",
                        }}
                      >
                        x{order.request_qty}
                      </span>
                    </td>
                    <td style={{ padding: "16px 12px", color: "#475569" }}>
                      {order.expected_delivery}
                    </td>
                    <td style={{ padding: "16px 12px" }}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          backgroundColor:
                            order.status === "Pending"
                              ? "#fef3c7"
                              : order.status === "Shipped"
                                ? "#dbeafe"
                                : "#d1fae5",
                          color:
                            order.status === "Pending"
                              ? "#b45309"
                              : order.status === "Shipped"
                                ? "#1e40af"
                                : "#047857",
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "right" }}>
                      {/* ACTION: PENDING -> SHIPPED */}
                      {order.status === "Pending" && (
                        <button
                          onClick={() => updateStatus(order.id, "Shipped")}
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Truck size={14} /> Dispatch
                        </button>
                      )}

                      {/* ACTION: SHIPPED -> DELIVERED (WITH EXPIRY DATE PICKER) */}
                      {order.status === "Shipped" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-end",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              textAlign: "left",
                              background: "#f8fafc",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <label
                              style={{
                                fontSize: "0.65rem",
                                color: "#64748b",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Calendar size={10} /> BATCH EXPIRY
                            </label>
                            <input
                              type="date"
                              value={expiryDates[order.id] || ""}
                              onChange={(e) =>
                                handleExpiryChange(order.id, e.target.value)
                              }
                              style={{
                                border: "none",
                                outline: "none",
                                background: "transparent",
                                fontSize: "0.8rem",
                                color: "#0f172a",
                                marginTop: "2px",
                                cursor: "pointer",
                              }}
                            />
                          </div>

                          <button
                            onClick={() => updateStatus(order.id, "Delivered")}
                            style={{
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              padding: "10px 16px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <CheckCircle2 size={14} /> Mark Delivered
                          </button>
                        </div>
                      )}

                      {/* ACTION: DELIVERED */}
                      {order.status === "Delivered" && (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.85rem",
                            fontStyle: "italic",
                            fontWeight: "bold",
                          }}
                        >
                          Completed ✓
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Basic inline CSS to make the toast pop in smoothly */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn {
          from { top: 0; opacity: 0; }
          to { top: 20px; opacity: 1; }
        }
      `,
        }}
      />
    </div>
  );
};

export default SupplierDashboard;
