import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  CreditCard,
  Receipt,
  MapPin,
  XCircle,
  Send,
  X,
  Gift,
  Camera, // NEW: Imported the Camera icon
} from "lucide-react";
import "../styles/Marketplace.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [transferModal, setTransferModal] = useState({
    show: false,
    orderId: null,
  });
  const [transferData, setTransferData] = useState({
    username: "",
    address: "",
  });
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/customer/orders/",
        {
          headers: { Authorization: `Token ${token}` },
        },
      );

      let ordersArray = [];
      if (Array.isArray(res.data)) ordersArray = res.data;
      else if (res.data.orders && Array.isArray(res.data.orders))
        ordersArray = res.data.orders;
      else if (res.data.data && Array.isArray(res.data.data))
        ordersArray = res.data.data;

      setOrders(ordersArray);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?",
    );
    if (!confirmCancel) return;

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/customer/cancel-order/${orderId}/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      fetchOrders();
    } catch (err) {
      alert("Failed to cancel order.");
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferData.username || !transferData.address) {
      alert("Please fill in both fields.");
      return;
    }

    setTransferring(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/customer/forward-order/${transferModal.orderId}/`,
        transferData,
        { headers: { Authorization: `Token ${token}` } },
      );

      alert(`Successfully transferred to ${transferData.username}!`);
      setTransferModal({ show: false, orderId: null });
      setTransferData({ username: "", address: "" });
      fetchOrders();
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Transfer failed. Please check the username.",
      );
    } finally {
      setTransferring(false);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getStatusIndex = (status) => {
    const s = status.toLowerCase();
    if (s === "pending") return 1;
    if (s === "processing") return 2;
    if (s === "shipped") return 3;
    if (s === "delivered") return 4;
    if (s === "cancelled") return -1;
    return 1;
  };

  if (loading)
    return (
      <div className="status-msg" style={{ marginTop: "100px" }}>
        Loading your purchase history...
      </div>
    );

  return (
    <div
      style={{ maxWidth: "1000px", margin: "3rem auto", padding: "0 1.5rem" }}
    >
      {/* --- TRANSFER MODAL --- */}
      {transferModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            zIndex: 3000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "450px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setTransferModal({ show: false, orderId: null })}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <X size={24} />
            </button>
            <h3
              style={{
                margin: "0 0 1.5rem 0",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Send size={20} color="var(--primary)" /> Transfer Order #
              {transferModal.orderId}
            </h3>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--text-main)",
                  marginBottom: "6px",
                }}
              >
                Recipient Username
              </label>
              <input
                type="text"
                placeholder="e.g., john_doe"
                value={transferData.username}
                onChange={(e) =>
                  setTransferData({ ...transferData, username: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--text-main)",
                  marginBottom: "6px",
                }}
              >
                New Delivery Address
              </label>
              <textarea
                placeholder="Where should we drop this off?"
                value={transferData.address}
                onChange={(e) =>
                  setTransferData({ ...transferData, address: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  minHeight: "80px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleTransferSubmit}
              disabled={transferring}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: transferring ? "not-allowed" : "pointer",
              }}
            >
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h2
            style={{ margin: 0, fontSize: "2rem", color: "var(--text-main)" }}
          >
            Your Purchase History
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
            View and manage your recent FreshFetch orders.
          </p>
        </div>
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "var(--primary)",
          }}
        >
          {orders.length} Records Found
        </div>
      </div>

      {orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            background: "var(--card-bg)",
            borderRadius: "var(--radius-card)",
            border: "1px dashed var(--border)",
          }}
        >
          <Package size={48} color="#cbd5e1" style={{ marginBottom: "1rem" }} />
          <h3 style={{ color: "var(--text-main)" }}>No orders yet</h3>
          <Link
            to="/"
            style={{
              color: "var(--primary)",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Start shopping now &rarr;
          </Link>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {orders.map((order) => {
            const statusIdx = getStatusIndex(order.status);
            const isCancelled = statusIdx === -1;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--card-bg)",
                  borderRadius: "var(--radius-card)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    padding: "1.5rem",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "1.2rem",
                          color: "var(--text-main)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        ORDER ID #{order.id}
                        {order.is_transferred && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              background: "#fef3c7",
                              color: "#b45309",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: "700",
                              border: "1px solid #fde68a",
                              letterSpacing: "0.5px",
                            }}
                          >
                            <Gift size={12} />
                            GIFT FROM{" "}
                            {order.transferred_by
                              ? order.transferred_by.toUpperCase()
                              : "A FRIEND"}
                          </span>
                        )}
                      </h3>
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Calendar size={14} />{" "}
                        {new Date(
                          order.created_at || Date.now(),
                        ).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          fontWeight: "700",
                        }}
                      >
                        Amount Paid
                      </p>
                      <strong
                        style={{ fontSize: "1.4rem", color: "var(--primary)" }}
                      >
                        ₹{parseFloat(order.total_price).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  {!isCancelled ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "relative",
                        padding: "0 10px",
                        margin: "2rem 0",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "10px",
                          right: "10px",
                          height: "3px",
                          background: "#e2e8f0",
                          zIndex: 1,
                          transform: "translateY(-50%)",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: "var(--primary)",
                            width: `${((statusIdx - 1) / 3) * 100}%`,
                            transition: "width 0.4s ease",
                          }}
                        ></div>
                      </div>
                      {["Pending", "Processing", "Shipped", "Delivered"].map(
                        (step, idx) => {
                          const stepNum = idx + 1;
                          const isActive = statusIdx >= stepNum;
                          return (
                            <div
                              key={step}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "8px",
                                zIndex: 2,
                                background: "var(--card-bg)",
                                padding: "0 8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  background: isActive
                                    ? "var(--primary)"
                                    : "#e2e8f0",
                                  border: isActive
                                    ? "3px solid #ccfbf1"
                                    : "3px solid white",
                                }}
                              ></div>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: isActive ? "600" : "500",
                                  color: isActive
                                    ? "var(--text-main)"
                                    : "#94a3b8",
                                }}
                              >
                                {step}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "1rem",
                        background: "#fef2f2",
                        borderRadius: "8px",
                        color: "var(--danger)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: "600",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <XCircle size={18} /> This order was cancelled.
                    </div>
                  )}

                  {/* ACTION BAR WITH TRANSFER BUTTON */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px dashed var(--border)",
                      paddingTop: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px" }}>
                      {statusIdx === 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                            style={{
                              background: "white",
                              border: "1px solid #fee2e2",
                              color: "var(--danger)",
                              padding: "6px 16px",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Cancel Order
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransferModal({
                                show: true,
                                orderId: order.id,
                              });
                            }}
                            style={{
                              background: "#f0fdfa",
                              border: "1px solid #ccfbf1",
                              color: "var(--primary)",
                              padding: "6px 16px",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Send size={14} /> Transfer
                          </button>
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--primary)",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                      }}
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </div>
                  </div>
                </div>

                {/* --- EXPANDED DETAILS SECTION --- */}
                {isExpanded && (
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "2rem",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 1rem 0",
                        color: "var(--text-main)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Receipt size={18} color="var(--primary)" /> Digital
                      Receipt
                    </h4>

                    <div
                      style={{
                        background: "white",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: "2px solid var(--border)",
                              color: "var(--text-muted)",
                              fontSize: "0.8rem",
                              textAlign: "left",
                              textTransform: "uppercase",
                            }}
                          >
                            <th
                              style={{
                                paddingBottom: "12px",
                                fontWeight: "700",
                              }}
                            >
                              Item
                            </th>
                            <th
                              style={{
                                paddingBottom: "12px",
                                fontWeight: "700",
                                textAlign: "center",
                              }}
                            >
                              Qty
                            </th>
                            <th
                              style={{
                                paddingBottom: "12px",
                                fontWeight: "700",
                                textAlign: "right",
                              }}
                            >
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, i) => (
                              <tr
                                key={i}
                                style={{
                                  borderBottom:
                                    i !== order.items.length - 1
                                      ? "1px solid #f1f5f9"
                                      : "none",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "16px 0",
                                    color: "var(--text-main)",
                                    fontWeight: "500",
                                  }}
                                >
                                  {item.product_name || item.name}
                                </td>
                                <td
                                  style={{
                                    padding: "16px 0",
                                    color: "var(--text-muted)",
                                    textAlign: "center",
                                  }}
                                >
                                  x{item.quantity}
                                </td>
                                <td
                                  style={{
                                    padding: "16px 0",
                                    color: "var(--text-main)",
                                    textAlign: "right",
                                    fontWeight: "600",
                                  }}
                                >
                                  ₹
                                  {(
                                    parseFloat(
                                      item.price || item.current_price,
                                    ) * item.quantity
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan="3"
                                style={{
                                  padding: "16px 0",
                                  color: "var(--text-muted)",
                                  fontStyle: "italic",
                                }}
                              >
                                Item details currently unavailable.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          background: "white",
                          padding: "1.5rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <h5
                          style={{
                            margin: "0 0 12px 0",
                            color: "var(--text-main)",
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <CreditCard size={16} color="var(--primary)" />{" "}
                          Payment Info
                        </h5>
                        <p
                          style={{
                            margin: "0 0 6px 0",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
                          Status:{" "}
                          <strong style={{ color: "#10b981" }}>
                            PAID IN FULL
                          </strong>
                        </p>
                        <p
                          style={{
                            margin: "0",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
                          Time:{" "}
                          {new Date(
                            order.created_at || Date.now(),
                          ).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div
                        style={{
                          background: "white",
                          padding: "1.5rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <h5
                          style={{
                            margin: "0 0 12px 0",
                            color: "var(--text-main)",
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <MapPin size={16} color="var(--primary)" />{" "}
                          Fulfillment
                        </h5>
                        <p
                          style={{
                            margin: "0 0 6px 0",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
                          Delivery Priority:{" "}
                          <strong style={{ color: "var(--text-main)" }}>
                            Standard Routine
                          </strong>
                        </p>
                        <p
                          style={{
                            margin: "0",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
                          Branch:{" "}
                          <strong style={{ color: "var(--text-main)" }}>
                            {order.store_name}
                          </strong>
                        </p>
                        <div
                          style={{
                            marginTop: "12px",
                            paddingTop: "12px",
                            borderTop: "1px dashed var(--border)",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 4px 0",
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              fontWeight: "700",
                            }}
                          >
                            Delivering To:
                          </p>
                          <p
                            style={{
                              margin: "0",
                              color: "var(--text-main)",
                              fontSize: "0.9rem",
                              lineHeight: "1.4",
                            }}
                          >
                            {order.delivery_address || "Address not provided"}
                          </p>
                        </div>

                        {/* --- NEW: PACKING SNAPSHOT BLOCK --- */}
                        {order.packing_photo && (
                          <div
                            style={{
                              marginTop: "1.5rem",
                              paddingTop: "1.5rem",
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 8px 0",
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <Camera size={14} /> Pre-Packing Snapshot:
                            </p>
                            <div
                              style={{
                                padding: "4px",
                                border: "1px solid var(--border)",
                                background: "white",
                                borderRadius: "6px",
                              }}
                            >
                              <img
                                src={order.packing_photo}
                                alt={`Packing Snapshot for Order #${order.id}`}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  borderRadius: "4px",
                                  display: "block",
                                }}
                              />
                            </div>
                            <p
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.8rem",
                                fontStyle: "italic",
                                marginTop: "6px",
                              }}
                            >
                              Verification photo taken before dispatch.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
