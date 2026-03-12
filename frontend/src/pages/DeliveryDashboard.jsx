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
  Phone,
  Store,
  AlertTriangle,
  Map,
  Clock, // <-- Added for Pending State
} from "lucide-react";

const DeliveryDashboard = () => {
  const [routeBatches, setRouteBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deliveryPhotos, setDeliveryPhotos] = useState({});
  const [appMessage, setAppMessage] = useState({ text: "", type: "" });
  const navigate = useNavigate();

  const showMessage = (text, type = "error") => {
    setAppMessage({ text, type });
    setTimeout(() => {
      setAppMessage({ text: "", type: "" });
    }, 4000);
  };

  const fetchDeliveryOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/delivery/orders/",
        { headers: { Authorization: `Token ${token}` } },
      );

      const orders = res.data;

      // Group orders into batches
      const groupedOrders = orders.reduce((acc, order) => {
        const key = order.batch_id || order.id.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
      }, {});

      setRouteBatches(Object.values(groupedOrders));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load delivery routes", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
  }, [navigate]);

  const handlePhotoSelect = (batchKey, file) => {
    setDeliveryPhotos((prev) => ({ ...prev, [batchKey]: file }));
  };

  const updateBatchStatus = async (batch, newStatus) => {
    const token = localStorage.getItem("token");
    const batchKey = batch[0].batch_id || batch[0].id.toString();

    if (newStatus === "Delivered" && !deliveryPhotos[batchKey]) {
      showMessage(
        "Please upload a Proof of Delivery photo for this route!",
        "error",
      );
      return;
    }

    try {
      await Promise.all(
        batch.map(async (order) => {
          const formData = new FormData();
          formData.append("status", newStatus);

          if (newStatus === "Delivered") {
            formData.append("image", deliveryPhotos[batchKey]);
          }

          return axios.post(
            `http://127.0.0.1:8000/api/delivery/update-order/${order.id}/`,
            formData,
            {
              headers: {
                Authorization: `Token ${token}`,
                "Content-Type": "multipart/form-data",
              },
            },
          );
        }),
      );

      showMessage(`Route marked as ${newStatus}!`, "success");
      fetchDeliveryOrders();
    } catch (err) {
      showMessage("Failed to update route status. Check connection.", "error");
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
        Loading Consolidated Routes...
      </div>
    );

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        paddingBottom: "3rem",
        position: "relative",
      }}
    >
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
              Consolidated Route Assignments
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
        {routeBatches.length === 0 ? (
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
          routeBatches.map((batch) => {
            // --- THE FIX: CALCULATE EXACT BATCH READINESS ---
            // If ANY order is still pending, the driver must wait.
            const isPending = batch.some((o) =>
              ["pending", "processing"].includes(o.status.toLowerCase()),
            );
            // If ALL orders are shipped, it's ready.
            const isReadyForPickup = batch.every(
              (o) => o.status.toLowerCase() === "shipped",
            );
            // If it's already in transit
            const isOutForDelivery = batch.every(
              (o) => o.status.toLowerCase() === "out for delivery",
            );

            const customerName = batch[0].customer_name.toUpperCase();
            const customerPhone = batch[0].customer_phone;
            const deliveryAddress = batch[0].delivery_address;
            const batchKey = batch[0].batch_id || batch[0].id.toString();
            const routeIdDisplay = batch.map((o) => `#${o.id}`).join(" / ");
            const isMultiStop = batch.length > 1;

            return (
              <div
                key={batchKey}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  border: "2px solid",
                  borderColor: isMultiStop ? "#8b5cf6" : "#e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                }}
              >
                {/* DYNAMIC STATUS BAR */}
                <div
                  style={{
                    background: isPending
                      ? "#f3f4f6"
                      : isReadyForPickup
                        ? "#fef3c7"
                        : "#dbeafe",
                    padding: "12px 16px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong
                    style={{
                      color: isPending
                        ? "#475569"
                        : isReadyForPickup
                          ? "#b45309"
                          : "#1e40af",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isPending ? (
                      <Clock size={18} />
                    ) : isMultiStop ? (
                      <Map size={18} />
                    ) : isReadyForPickup ? (
                      <Package size={18} />
                    ) : (
                      <Truck size={18} />
                    )}
                    {isPending
                      ? "Waiting for Store Packaging..."
                      : isMultiStop
                        ? "Consolidated Multi-Stop Route"
                        : isReadyForPickup
                          ? "Ready for Pickup"
                          : "In Transit"}
                  </strong>
                  <span
                    style={{
                      fontWeight: "800",
                      color: "#334155",
                      fontSize: "0.85rem",
                    }}
                  >
                    {routeIdDisplay}
                  </span>
                </div>

                <div style={{ padding: "1.5rem" }}>
                  <h3
                    style={{
                      margin: "0 0 1.5rem 0",
                      fontSize: "1rem",
                      color: "#0f172a",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Navigation Protocol
                  </h3>

                  {/* LOOP THROUGH ALL PICKUP LOCATIONS */}
                  {batch.map((stop, i) => {
                    const isStopReady =
                      stop.status.toLowerCase() !== "pending" &&
                      stop.status.toLowerCase() !== "processing";

                    return (
                      <div
                        key={stop.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          marginBottom: "1.5rem",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: "17px",
                            top: "36px",
                            bottom: "-30px",
                            width: "2px",
                            backgroundColor: "#e2e8f0",
                            zIndex: 0,
                          }}
                        ></div>

                        <div
                          style={{
                            background: "#eff6ff",
                            padding: "8px",
                            borderRadius: "50%",
                            color: "#3b82f6",
                            zIndex: 1,
                            border: "2px solid white",
                          }}
                        >
                          <Store size={18} />
                        </div>

                        <div style={{ width: "100%" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 4px 0",
                                fontSize: "0.75rem",
                                color: "#3b82f6",
                                textTransform: "uppercase",
                                fontWeight: "900",
                              }}
                            >
                              STOP {i + 1}: PICKUP
                            </p>

                            {/* INDIVIDUAL STORE STATUS */}
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                color: isStopReady ? "#10b981" : "#f59e0b",
                              }}
                            >
                              {isStopReady ? (
                                <>
                                  <CheckCircle2 size={12} /> Packed
                                </>
                              ) : (
                                <>
                                  <Clock size={12} /> Packing...
                                </>
                              )}
                            </span>
                          </div>

                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              opacity: isStopReady ? 1 : 0.6,
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 2px 0",
                                fontWeight: "bold",
                                color: "#0f172a",
                              }}
                            >
                              {stop.store_name}
                            </p>
                            <p
                              style={{
                                margin: "0 0 10px 0",
                                fontSize: "0.85rem",
                                color: "#475569",
                                lineHeight: "1.4",
                              }}
                            >
                              {stop.pickup_address}
                            </p>

                            {stop.packing_photo && (
                              <div>
                                <p
                                  style={{
                                    margin: "0 0 4px 0",
                                    fontSize: "0.7rem",
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    fontWeight: "bold",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <Camera size={12} /> Package ID: #{stop.id}
                                </p>
                                <img
                                  src={stop.packing_photo}
                                  alt="Package"
                                  style={{
                                    width: "100%",
                                    height: "100px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* FINAL DROPOFF LOCATION */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginTop: "1rem",
                    }}
                  >
                    <div
                      style={{
                        background: "#fef2f2",
                        padding: "8px",
                        borderRadius: "50%",
                        color: "#ef4444",
                        zIndex: 1,
                        border: "2px solid white",
                      }}
                    >
                      <MapPin size={18} />
                    </div>
                    <div style={{ width: "100%" }}>
                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "0.75rem",
                          color: "#ef4444",
                          textTransform: "uppercase",
                          fontWeight: "900",
                        }}
                      >
                        FINAL STOP: DELIVERY
                      </p>
                      <div
                        style={{
                          backgroundColor: "#fef2f2",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #fecaca",
                          opacity: isPending ? 0.6 : 1,
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 2px 0",
                            fontWeight: "bold",
                            color: "#0f172a",
                          }}
                        >
                          {customerName}
                        </p>
                        <p
                          style={{
                            margin: "0 0 10px 0",
                            fontSize: "0.9rem",
                            color: "#475569",
                            lineHeight: "1.4",
                          }}
                        >
                          {deliveryAddress || "Address not provided"}
                        </p>

                        {customerPhone && customerPhone !== "Not Provided" && (
                          <a
                            href={`tel:${customerPhone}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "white",
                              color: "#0d9488",
                              padding: "6px 12px",
                              borderRadius: "20px",
                              textDecoration: "none",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              border: "1px solid #ccfbf1",
                            }}
                          >
                            <Phone size={14} /> Call Customer
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PROOF OF DELIVERY UPLOAD */}
                  {isOutForDelivery && (
                    <div
                      style={{
                        marginTop: "2rem",
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
                        <Camera size={16} /> Upload Single Proof of Delivery
                      </p>
                      <p
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "0.75rem",
                          color: "#475569",
                        }}
                      >
                        Take one photo capturing all packages dropped at the
                        customer's door.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) =>
                          handlePhotoSelect(batchKey, e.target.files[0])
                        }
                        style={{
                          width: "100%",
                          fontSize: "0.9rem",
                          color: "#334155",
                        }}
                      />
                    </div>
                  )}

                  {/* ROUTE ACTIONS */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      borderTop: "1px dashed #e2e8f0",
                      paddingTop: "1.5rem",
                    }}
                  >
                    {/* DISABLED BUTTON: Waiting for stores */}
                    {isPending && (
                      <button
                        disabled
                        style={{
                          width: "100%",
                          padding: "14px",
                          backgroundColor: "#cbd5e1",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          fontSize: "1rem",
                          cursor: "not-allowed",
                        }}
                      >
                        Waiting for all stores to pack...
                      </button>
                    )}

                    {/* ENABLED BUTTON: Ready to Start */}
                    {isReadyForPickup && (
                      <button
                        onClick={() =>
                          updateBatchStatus(batch, "Out for Delivery")
                        }
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
                        <Truck size={18} />{" "}
                        {isMultiStop
                          ? "All Packages Picked Up (Start Route)"
                          : "Package Picked Up (Start Route)"}
                      </button>
                    )}

                    {/* ENABLED BUTTON: Complete Delivery */}
                    {isOutForDelivery && (
                      <button
                        onClick={() => updateBatchStatus(batch, "Delivered")}
                        disabled={!deliveryPhotos[batchKey]}
                        style={{
                          width: "100%",
                          padding: "14px",
                          backgroundColor: deliveryPhotos[batchKey]
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
                          cursor: deliveryPhotos[batchKey]
                            ? "pointer"
                            : "not-allowed",
                          transition: "0.3s",
                        }}
                      >
                        <CheckCircle2 size={18} />{" "}
                        {deliveryPhotos[batchKey]
                          ? "Mark Route Complete"
                          : "Photo Required to Complete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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

export default DeliveryDashboard;
