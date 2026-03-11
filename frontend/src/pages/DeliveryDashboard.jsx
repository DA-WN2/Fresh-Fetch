import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  User,
  Camera,
  LogOut,
  Phone, // Contact icon
} from "lucide-react";

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track the uploaded photo for each order
  const [deliveryPhotos, setDeliveryPhotos] = useState({});
  const navigate = useNavigate();

  const fetchDeliveryOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/delivery/orders/",
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load delivery orders", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
  }, [navigate]);

  const handlePhotoSelect = (orderId, file) => {
    setDeliveryPhotos((prev) => ({ ...prev, [orderId]: file }));
  };

  const updateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      // Use FormData to send both text and files seamlessly
      const formData = new FormData();
      formData.append("status", newStatus);

      // If marking as delivered, attach the photo!
      if (newStatus === "Delivered") {
        if (!deliveryPhotos[orderId]) {
          alert("Please upload a Proof of Delivery photo first!");
          return;
        }
        formData.append("image", deliveryPhotos[orderId]);
      }

      await axios.post(
        `http://127.0.0.1:8000/api/delivery/update-order/${orderId}/`,
        formData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data", // Required for images
          },
        },
      );
      fetchDeliveryOrders(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update order status.");
    }
  };

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontWeight: "bold",
          color: "var(--primary)",
        }}
      >
        Loading Delivery Routes...
      </div>
    );

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        paddingBottom: "3rem",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "white",
          padding: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Truck size={28} color="#38bdf8" />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.2rem" }}>Driver Portal</h1>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
              Active Route Assignments
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
            padding: "8px 12px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <LogOut size={16} /> Exit
        </button>
      </div>

      <div
        style={{
          maxWidth: "600px",
          margin: "2rem auto",
          padding: "0 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <CheckCircle2
              size={48}
              color="#10b981"
              style={{ marginBottom: "1rem" }}
            />
            <h3 style={{ color: "#334155", margin: "0 0 8px 0" }}>
              You're all caught up!
            </h3>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              No active deliveries right now.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const isReadyForPickup = order.status.toLowerCase() === "shipped";
            const isOutForDelivery =
              order.status.toLowerCase() === "out for delivery";

            return (
              <div
                key={order.id}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                }}
              >
                {/* STATUS BAR */}
                <div
                  style={{
                    background: isReadyForPickup ? "#fef3c7" : "#dbeafe",
                    padding: "12px 16px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong
                    style={{
                      color: isReadyForPickup ? "#b45309" : "#1e40af",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isReadyForPickup ? (
                      <Package size={18} />
                    ) : (
                      <Truck size={18} />
                    )}
                    {isReadyForPickup ? "Ready for Pickup" : "In Transit"}
                  </strong>
                  <span style={{ fontWeight: "800", color: "#334155" }}>
                    #{order.id}
                  </span>
                </div>

                <div style={{ padding: "1.5rem" }}>
                  {/* CUSTOMER & DESTINATION */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    {/* NEW: Updated Header with Call Button */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#475569",
                        }}
                      >
                        <User size={16} />{" "}
                        <strong>{order.customer_name.toUpperCase()}</strong>
                      </div>

                      {order.customer_phone &&
                        order.customer_phone !== "Not Provided" && (
                          <a
                            href={`tel:${order.customer_phone}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              padding: "6px 12px",
                              borderRadius: "20px",
                              textDecoration: "none",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            <Phone size={14} /> Call Customer
                          </a>
                        )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        color: "#334155",
                        backgroundColor: "#f8fafc",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <MapPin
                        size={20}
                        color="#ef4444"
                        style={{ marginTop: "2px", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "0.95rem", lineHeight: "1.4" }}>
                        {order.delivery_address}
                      </span>
                    </div>
                  </div>

                  {/* INITIAL PACKING PHOTO FROM MANAGER */}
                  {order.packing_photo && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "0.8rem",
                          color: "#64748b",
                          textTransform: "uppercase",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Camera size={14} /> Package Identifier
                      </p>
                      <img
                        src={order.packing_photo}
                        alt="Package"
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>
                  )}

                  {/* PROOF OF DELIVERY UPLOAD (Only shows when in transit) */}
                  {isOutForDelivery && (
                    <div
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1rem",
                        backgroundColor: "#f0fdfa",
                        border: "1px dashed #5eead4",
                        borderRadius: "8px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "0.85rem",
                          color: "#0f766e",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Camera size={16} /> Upload Proof of Delivery
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment" // Encourages mobile devices to open the camera directly!
                        onChange={(e) =>
                          handlePhotoSelect(order.id, e.target.files[0])
                        }
                        style={{
                          width: "100%",
                          fontSize: "0.9rem",
                          color: "#334155",
                        }}
                      />
                    </div>
                  )}

                  {/* ACTIONS */}
                  {isReadyForPickup && (
                    <button
                      onClick={() => updateStatus(order.id, "Out for Delivery")}
                      style={{
                        width: "100%",
                        padding: "14px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <Truck size={18} /> Start Route (Out for Delivery)
                    </button>
                  )}

                  {isOutForDelivery && (
                    <button
                      onClick={() => updateStatus(order.id, "Delivered")}
                      disabled={!deliveryPhotos[order.id]}
                      style={{
                        width: "100%",
                        padding: "14px",
                        backgroundColor: deliveryPhotos[order.id]
                          ? "#10b981"
                          : "#94a3b8",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        cursor: deliveryPhotos[order.id]
                          ? "pointer"
                          : "not-allowed",
                        transition: "0.3s",
                      }}
                    >
                      <CheckCircle2 size={18} />{" "}
                      {deliveryPhotos[order.id]
                        ? "Mark as Delivered"
                        : "Photo Required to Deliver"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
