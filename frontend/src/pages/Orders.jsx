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
  Camera,
  CheckCircle2,
  AlertTriangle,
  Store,
  Navigation,
  Truck,
  Clock,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/Marketplace.css";

const truckIcon = new L.divIcon({
  html: '<div style="font-size: 20px; background: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚚</div>',
  className: "custom-div-icon",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const storeIcon = new L.divIcon({
  html: '<div style="font-size: 18px; background: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #f59e0b; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏪</div>',
  className: "custom-div-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
const homeIcon = new L.divIcon({
  html: '<div style="font-size: 18px; background: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏠</div>',
  className: "custom-div-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function FitMapBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

const Orders = () => {
  const [orderBatches, setOrderBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatchId, setExpandedBatchId] = useState(null);

  const [transferModal, setTransferModal] = useState({
    show: false,
    batch: null,
  });
  const [transferData, setTransferData] = useState({
    username: "",
    address: "",
  });
  const [transferring, setTransferring] = useState(false);

  const [cancelModal, setCancelModal] = useState({ show: false, batch: null });
  const [cancelling, setCancelling] = useState(false);

  const [appMessage, setAppMessage] = useState({ text: "", type: "" });
  const [trackingData, setTrackingData] = useState(null);
  const [agentLocations, setAgentLocations] = useState({});
  const [routePaths, setRoutePaths] = useState({});

  // --- NEW: ETA STATE ---
  const [etas, setEtas] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let interval;
    if (expandedBatchId && trackingData) {
      interval = setInterval(() => {
        fetchAgentLocation(expandedBatchId);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [expandedBatchId, trackingData]);

  const showMessage = (text, type = "error") => {
    setAppMessage({ text, type });
    setTimeout(() => {
      setAppMessage({ text: "", type: "" });
    }, 4000);
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/customer/orders/",
        { headers: { Authorization: `Token ${token}` } },
      );

      let ordersArray = [];
      if (Array.isArray(res.data)) ordersArray = res.data;
      else if (res.data.orders && Array.isArray(res.data.orders))
        ordersArray = res.data.orders;
      else if (res.data.data && Array.isArray(res.data.data))
        ordersArray = res.data.data;

      const grouped = ordersArray.reduce((acc, order) => {
        const key = order.batch_id || order.id.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
      }, {});

      const groupedArray = Object.values(grouped).sort(
        (a, b) => new Date(b[0].created_at) - new Date(a[0].created_at),
      );

      setOrderBatches(groupedArray);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchTrackingData = async (batchId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://127.0.0.1:8000/api/tracking/${batchId}/`,
        { headers: { Authorization: `Token ${token}` } },
      );
      setTrackingData(res.data);
      fetchAgentLocation(batchId, true);
    } catch (err) {}
  };

  const fetchAgentLocation = async (batchId, silent = false) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/tracking/${batchId}/`,
        { headers: { Authorization: `Token ${token}` } },
      );
      if (res.data && res.data.agent && res.data.agent.lat) {
        setAgentLocations((prev) => ({
          ...prev,
          [batchId]: { lat: res.data.agent.lat, lng: res.data.agent.lng },
        }));
      }
    } catch (err) {
      if (!silent) console.log("Waiting for driver to share GPS...");
    }
  };

  // --- MAP ROUTING & ETA CALCULATION ---
  useEffect(() => {
    if (!expandedBatchId || !trackingData) return;

    const batchId = expandedBatchId;
    const batch = orderBatches.find(
      (b) => (b[0].batch_id || b[0].id.toString()) === batchId,
    );
    if (!batch) return;

    const primaryOrder = batch[0];

    const targetLat = primaryOrder?.delivery_lat || trackingData?.customer?.lat;
    const targetLng = primaryOrder?.delivery_lng || trackingData?.customer?.lng;

    const storeLat = trackingData?.stores?.[0]?.lat;
    const storeLng = trackingData?.stores?.[0]?.lng;

    const dLat =
      agentLocations[batchId]?.lat ||
      trackingData?.agent?.lat ||
      storeLat ||
      9.5785;
    const dLng =
      agentLocations[batchId]?.lng ||
      trackingData?.agent?.lng ||
      storeLng ||
      76.618;

    // Only fetch if we have coordinates and haven't fetched this route recently
    if (targetLat && targetLng && dLat && dLng && !routePaths[batchId]) {
      const fetchRoute = async () => {
        try {
          const coords = `${dLng},${dLat};${targetLng},${targetLat}`;
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          );

          if (!res.ok) throw new Error("OSRM Failed");

          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            // 1. Draw the Route
            const leafletCoords = data.routes[0].geometry.coordinates.map(
              (c) => [c[1], c[0]],
            );
            setRoutePaths((prev) => ({ ...prev, [batchId]: leafletCoords }));

            // 2. Calculate the ETA!
            // OSRM returns duration in seconds. Convert to minutes.
            const durationSeconds = data.routes[0].duration;
            const durationMins = Math.ceil(durationSeconds / 60);
            setEtas((prev) => ({ ...prev, [batchId]: durationMins }));
          }
        } catch (err) {}
      };
      fetchRoute();
    }
  }, [agentLocations, expandedBatchId, orderBatches, routePaths, trackingData]);

  const executeCancelOrder = async () => {
    if (!cancelModal.batch) return;
    setCancelling(true);
    const token = localStorage.getItem("token");
    try {
      await Promise.all(
        cancelModal.batch.map((order) =>
          axios.post(
            `http://127.0.0.1:8000/api/customer/cancel-order/${order.id}/`,
            {},
            { headers: { Authorization: `Token ${token}` } },
          ),
        ),
      );
      showMessage("Entire order cancelled successfully.", "success");
      setCancelModal({ show: false, batch: null });
      fetchOrders();
    } catch (err) {
      showMessage("Failed to cancel order.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferData.username || !transferData.address) {
      showMessage("Please fill in both fields.", "error");
      return;
    }
    setTransferring(true);
    const token = localStorage.getItem("token");
    try {
      await Promise.all(
        transferModal.batch.map((order) =>
          axios.post(
            `http://127.0.0.1:8000/api/customer/forward-order/${order.id}/`,
            transferData,
            { headers: { Authorization: `Token ${token}` } },
          ),
        ),
      );
      showMessage(
        `Successfully transferred to ${transferData.username}!`,
        "success",
      );
      setTransferModal({ show: false, batch: null });
      setTransferData({ username: "", address: "" });
      fetchOrders();
    } catch (err) {
      showMessage("Transfer failed. Please check the username.", "error");
    } finally {
      setTransferring(false);
    }
  };

  const toggleOrderDetails = (batchKey, currentStatus) => {
    if (expandedBatchId === batchKey) {
      setExpandedBatchId(null);
      setTrackingData(null);
    } else {
      setExpandedBatchId(batchKey);
      if (currentStatus === "Out for Delivery") {
        fetchTrackingData(batchKey);
      } else {
        setTrackingData(null);
      }
    }
  };

  const getStatusIndex = (status) => {
    const s = status.toLowerCase();
    if (s === "pending") return 1;
    if (s === "processing") return 2;
    if (s === "shipped") return 3;
    if (s === "out for delivery") return 3;
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
      style={{
        maxWidth: "1000px",
        margin: "3rem auto",
        padding: "0 1.5rem",
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
          )}{" "}
          {appMessage.text}
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModal.show && (
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
              maxWidth: "400px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: "#fee2e2",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <AlertTriangle color="#ef4444" size={28} />
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                color: "var(--text-main)",
                fontSize: "1.2rem",
              }}
            >
              Cancel Order?
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              This action cannot be undone. Are you sure you want to cancel this
              entire order and refund the items?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setCancelModal({ show: false, batch: null })}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "white",
                  color: "var(--text-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                No, Keep it
              </button>
              <button
                onClick={executeCancelOrder}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: cancelling ? "not-allowed" : "pointer",
                }}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
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
              position: "relative",
            }}
          >
            <button
              onClick={() => setTransferModal({ show: false, batch: null })}
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
              <Send size={20} color="var(--primary)" /> Transfer Order
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
          <p style={{ color: "var(--text-muted)", margin: "8px 0 0 0" }}>
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
          {orderBatches.length} Orders Found
        </div>
      </div>

      {orderBatches.length === 0 ? (
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
          {orderBatches.map((batch) => {
            const primaryOrder = batch[0];
            const batchKey =
              primaryOrder.batch_id || primaryOrder.id.toString();
            const isExpanded = expandedBatchId === batchKey;
            const combinedTotal = batch.reduce(
              (sum, o) => sum + parseFloat(o.total_price),
              0,
            );
            const combinedItems = batch.flatMap((o) => o.items);

            let currentStatus = "Pending";
            if (batch.every((o) => o.status.toLowerCase() === "delivered"))
              currentStatus = "Delivered";
            else if (
              batch.some(
                (o) =>
                  o.status.toLowerCase() === "out for delivery" ||
                  o.status.toLowerCase() === "delivered",
              )
            )
              currentStatus = "Out for Delivery";
            else if (batch.every((o) => o.status.toLowerCase() === "shipped"))
              currentStatus = "Shipped";
            else if (batch.some((o) => o.status.toLowerCase() === "shipped"))
              currentStatus = "Processing";

            const statusIdx = getStatusIndex(currentStatus);
            const isCancelled = statusIdx === -1;
            const displayId = batch.map((o) => `#${o.id}`).join(" / ");
            const ordersWithPhotos = batch.filter((o) => o.packing_photo);

            const streetRoute = routePaths[batchKey];
            const estimatedMins = etas[batchKey];

            const customerLat =
              primaryOrder.delivery_lat || trackingData?.customer?.lat;
            const customerLng =
              primaryOrder.delivery_lng || trackingData?.customer?.lng;

            const storeLat = trackingData?.stores?.[0]?.lat;
            const storeLng = trackingData?.stores?.[0]?.lng;

            const driverLat =
              agentLocations[batchKey]?.lat ||
              trackingData?.agent?.lat ||
              storeLat ||
              9.5785;
            const driverLng =
              agentLocations[batchKey]?.lng ||
              trackingData?.agent?.lng ||
              storeLng ||
              76.618;

            return (
              <div
                key={batchKey}
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
                  onClick={() => toggleOrderDetails(batchKey, currentStatus)}
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
                        ORDER {displayId}
                        {primaryOrder.is_transferred && (
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
                            }}
                          >
                            <Gift size={12} /> GIFT FROM{" "}
                            {primaryOrder.transferred_by
                              ? primaryOrder.transferred_by.toUpperCase()
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
                        <Calendar size={14} />
                        {new Date(
                          primaryOrder.created_at || Date.now(),
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
                        Total Amount Paid
                      </p>
                      <strong
                        style={{ fontSize: "1.4rem", color: "var(--primary)" }}
                      >
                        ₹{combinedTotal.toFixed(2)}
                      </strong>
                    </div>
                  </div>

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
                              setCancelModal({ show: true, batch: batch });
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
                              setTransferModal({ show: true, batch: batch });
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

                {isExpanded && (
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "2rem",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {currentStatus === "Out for Delivery" &&
                      !customerLat &&
                      !customerLng && (
                        <div
                          style={{
                            padding: "1rem",
                            background: "#fef3c7",
                            color: "#b45309",
                            borderRadius: "8px",
                            marginBottom: "1.5rem",
                            border: "1px solid #fde68a",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "0.9rem",
                            fontWeight: "bold",
                          }}
                        >
                          <AlertTriangle size={18} /> Map tracking is
                          unavailable because no GPS pin was saved during
                          checkout.
                        </div>
                      )}

                    {currentStatus === "Out for Delivery" &&
                      customerLat &&
                      customerLng && (
                        <div
                          style={{
                            marginBottom: "2rem",
                            border: "2px solid #3b82f6",
                            borderRadius: "8px",
                            overflow: "hidden",
                          }}
                        >
                          {/* --- NEW: ETA BANNER --- */}
                          <div
                            style={{
                              background: "#eff6ff",
                              padding: "10px 16px",
                              borderBottom: "1px solid #bfdbfe",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                color: "#1d4ed8",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                              }}
                            >
                              <Navigation size={18} /> Driver is on the way!
                            </div>
                            {estimatedMins && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "#dbeafe",
                                  color: "#1e40af",
                                  padding: "4px 12px",
                                  borderRadius: "20px",
                                  fontSize: "0.85rem",
                                  fontWeight: "800",
                                }}
                              >
                                <Clock size={14} /> Arriving in ~{estimatedMins}{" "}
                                mins
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              height: "300px",
                              width: "100%",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <MapContainer
                              center={[
                                parseFloat(customerLat),
                                parseFloat(customerLng),
                              ]}
                              zoom={13}
                              style={{ height: "100%", width: "100%" }}
                            >
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                              <FitMapBounds
                                coords={[
                                  ...(driverLat && driverLng
                                    ? [[driverLat, driverLng]]
                                    : []),
                                  [
                                    parseFloat(customerLat),
                                    parseFloat(customerLng),
                                  ],
                                  ...(trackingData && trackingData.stores
                                    ? trackingData.stores.map((s) => [
                                        s.lat,
                                        s.lng,
                                      ])
                                    : []),
                                ]}
                              />

                              <Marker
                                position={[
                                  parseFloat(customerLat),
                                  parseFloat(customerLng),
                                ]}
                                icon={homeIcon}
                              >
                                <Popup>Your Dropoff Location</Popup>
                              </Marker>

                              {trackingData &&
                                trackingData.stores &&
                                trackingData.stores.map((store, i) => (
                                  <Marker
                                    key={i}
                                    position={[store.lat, store.lng]}
                                    icon={storeIcon}
                                  >
                                    <Popup>{store.name}</Popup>
                                  </Marker>
                                ))}

                              {driverLat && driverLng && (
                                <Marker
                                  position={[driverLat, driverLng]}
                                  icon={truckIcon}
                                  zIndexOffset={1000}
                                >
                                  <Popup>Your Driver</Popup>
                                </Marker>
                              )}

                              {driverLat && driverLng && streetRoute ? (
                                <Polyline
                                  key={`osrm-${batchKey}`}
                                  positions={streetRoute}
                                  color="#3b82f6"
                                  weight={5}
                                  opacity={0.8}
                                />
                              ) : (
                                driverLat &&
                                driverLng && (
                                  <Polyline
                                    key={`fallback-${batchKey}`}
                                    positions={[
                                      [driverLat, driverLng],
                                      [
                                        parseFloat(customerLat),
                                        parseFloat(customerLng),
                                      ],
                                    ]}
                                    color="#3b82f6"
                                    dashArray="5, 10"
                                    weight={3}
                                    opacity={0.5}
                                  />
                                )
                              )}
                            </MapContainer>
                          </div>
                        </div>
                      )}

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
                          {combinedItems && combinedItems.length > 0 ? (
                            combinedItems.map((item, i) => (
                              <tr
                                key={i}
                                style={{
                                  borderBottom:
                                    i !== combinedItems.length - 1
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
                            primaryOrder.created_at || Date.now(),
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
                          Fulfillment Route
                        </h5>

                        <div
                          style={{
                            marginBottom: "12px",
                            paddingBottom: "12px",
                            borderBottom: "1px dashed var(--border)",
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
                            Sourced From:
                          </p>
                          {batch.map((b) => (
                            <p
                              key={b.id}
                              style={{
                                margin: "0 0 4px 0",
                                color: "var(--text-main)",
                                fontSize: "0.9rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <Store size={14} color="#8b5cf6" /> {b.store_name}
                            </p>
                          ))}
                        </div>

                        <div>
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
                            {primaryOrder.delivery_address ||
                              "Address not provided"}
                          </p>
                        </div>

                        {ordersWithPhotos.length > 0 && (
                          <div
                            style={{
                              marginTop: "1.5rem",
                              paddingTop: "1.5rem",
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 12px 0",
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                fontWeight: "700",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <Camera size={14} /> Security Snapshots:
                            </p>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  ordersWithPhotos.length > 1
                                    ? "1fr 1fr"
                                    : "1fr",
                                gap: "10px",
                              }}
                            >
                              {ordersWithPhotos.map((o) => (
                                <div
                                  key={`photo-${o.id}`}
                                  style={{
                                    padding: "4px",
                                    border: "1px solid var(--border)",
                                    background: "white",
                                    borderRadius: "6px",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: "4px 4px 6px 4px",
                                      fontSize: "0.75rem",
                                      color: "var(--text-main)",
                                      fontWeight: "600",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <Store size={12} color="var(--primary)" />{" "}
                                    {o.store_name}
                                  </p>
                                  <img
                                    src={o.packing_photo}
                                    alt={`Snapshot from ${o.store_name}`}
                                    style={{
                                      width: "100%",
                                      height: "120px",
                                      objectFit: "cover",
                                      borderRadius: "4px",
                                      display: "block",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
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
