import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Plus,
  Home,
  Briefcase,
  Map,
  Trash2,
} from "lucide-react";
import "../styles/Marketplace.css";

const Checkout = ({ cart, setCart }) => {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("card");
  const [notification, setNotification] = useState({ text: "", type: "" });
  const navigate = useNavigate();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);

  // Captures both naming conventions safely
  const [newAddressForm, setNewAddressForm] = useState({
    label: "Home",
    full_address: "",
    latitude: null,
    longitude: null,
    lat: null,
    lng: null,
  });

  const total = cart.reduce(
    (acc, it) =>
      acc + (Number(it.product.current_price) || 0) * (it.quantity || 1),
    0,
  );

  const showNotification = (text, type = "success") => {
    setNotification({ text, type });
    if (type === "error") {
      setTimeout(() => setNotification({ text: "", type: "" }), 4500);
    }
  };

  const fetchAddresses = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/customer/addresses/",
        { headers: { Authorization: `Token ${token}` } },
      );
      setSavedAddresses(res.data);
      if (res.data.length > 0) {
        const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err) {
      console.log("Failed to load addresses");
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const captureGPSForNewAddress = () => {
    if (!navigator.geolocation) {
      showNotification(
        "Geolocation is not supported by your browser.",
        "error",
      );
      return;
    }
    showNotification("Fetching GPS...", "success");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewAddressForm({
          ...newAddressForm,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        showNotification("Exact GPS coordinates captured! ✓", "success");
      },
      (error) => {
        showNotification(
          "Please allow location access in your browser.",
          "error",
        );
      },
    );
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!newAddressForm.latitude && !newAddressForm.lat) {
      showNotification("Please capture GPS coordinates first!", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/customer/addresses/",
        newAddressForm,
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      showNotification("Address saved!", "success");
      setShowAddModal(false);
      setNewAddressForm({
        label: "Home",
        full_address: "",
        latitude: null,
        longitude: null,
        lat: null,
        lng: null,
      });
      fetchAddresses();
    } catch (err) {
      showNotification("Failed to save address.", "error");
    }
  };

  const deleteAddress = async (id, e) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/customer/addresses/${id}/`,
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      if (selectedAddressId === id) setSelectedAddressId(null);
      fetchAddresses();
    } catch (err) {
      showNotification("Failed to delete address.", "error");
    }
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      showNotification("Your basket is empty!", "error");
      return;
    }
    if (!selectedAddressId) {
      showNotification("Please select a delivery address.", "error");
      return;
    }

    const selectedAddrData = savedAddresses.find(
      (a) => a.id === selectedAddressId,
    );

    // SAFELY GET COORDINATES
    const finalLat = selectedAddrData.lat || selectedAddrData.latitude;
    const finalLng = selectedAddrData.lng || selectedAddrData.longitude;

    // THE STRICT VALIDATION: Blocks checkout if coordinates are missing
    if (!finalLat || !finalLng) {
      showNotification(
        "This address is missing GPS coordinates! Please click 'Add New' and pin your location.",
        "error",
      );
      return;
    }

    setPaying(true);
    const token = localStorage.getItem("token");

    try {
      const formattedItems = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity || 1,
      }));

      const payload = {
        cart_items: formattedItems,
        delivery_address: `${selectedAddrData.label}: ${selectedAddrData.full_address}`,
        delivery_lat: finalLat,
        delivery_lng: finalLng,
      };

      console.log("SENDING PAYLOAD TO DJANGO:", payload); // <-- Check your console!

      await axios.post(
        "http://127.0.0.1:8000/api/customer/checkout/",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Token ${token}` : "",
          },
        },
      );

      setPaying(false);
      setCart([]);
      showNotification(`Payment Successful!`, "success");
      setTimeout(() => navigate("/orders"), 2500);
    } catch (err) {
      setPaying(false);
      showNotification("Payment Failed. Please try again.", "error");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    fontFamily: "Inter, sans-serif",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    marginTop: "6px",
  };
  const labelStyle = {
    display: "block",
    fontWeight: "600",
    color: "var(--text-main)",
    fontSize: "0.85rem",
  };

  const getLabelIcon = (label) => {
    if (label.toLowerCase() === "home") return <Home size={18} />;
    if (label.toLowerCase() === "work") return <Briefcase size={18} />;
    return <Map size={18} />;
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "3rem auto",
        padding: "0 1.5rem",
        position: "relative",
      }}
    >
      {notification.text && (
        <div
          style={{
            position: "fixed",
            top: "90px",
            right: "32px",
            background:
              notification.type === "error"
                ? "var(--danger)"
                : "var(--primary)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            zIndex: 2000,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {notification.type === "error" ? (
            <AlertCircle size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}{" "}
          {notification.text}
        </div>
      )}

      {showAddModal && (
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
              onClick={() => setShowAddModal(false)}
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
              <MapPin size={20} color="var(--primary)" /> Add New Address
            </h3>

            <form onSubmit={handleSaveAddress}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>Save As</label>
                <select
                  value={newAddressForm.label}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      label: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="College">College</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={labelStyle}>Full Address Details</label>
                <textarea
                  placeholder="Flat No, Building Name, Street..."
                  required
                  value={newAddressForm.full_address}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      full_address: e.target.value,
                    })
                  }
                  style={{
                    ...inputStyle,
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  marginBottom: "2rem",
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <label style={{ ...labelStyle, marginBottom: "8px" }}>
                  Location Pin (Required)
                </label>
                <button
                  type="button"
                  onClick={captureGPSForNewAddress}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background:
                      newAddressForm.latitude || newAddressForm.lat
                        ? "#d1fae5"
                        : "white",
                    border:
                      newAddressForm.latitude || newAddressForm.lat
                        ? "1px solid #10b981"
                        : "1px solid var(--primary)",
                    color:
                      newAddressForm.latitude || newAddressForm.lat
                        ? "#059669"
                        : "var(--primary)",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    transition: "0.2s",
                  }}
                >
                  <MapPin size={16} />{" "}
                  {newAddressForm.latitude || newAddressForm.lat
                    ? "GPS Pinned ✓"
                    : "Tap to Pin Exact GPS"}
                </button>
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "2rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1.5rem",
        }}
      >
        <Lock size={28} color="var(--primary)" />
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.75rem",
              color: "var(--text-main)",
            }}
          >
            Secure Checkout
          </h2>
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ShieldCheck size={14} color="#10b981" /> 256-bit SSL Encryption
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "3rem",
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "var(--card-bg)",
            padding: "2rem",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Delivery Address</h3>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.85rem",
              }}
            >
              <Plus size={16} /> Add New
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "2.5rem",
            }}
          >
            {savedAddresses.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  textAlign: "center",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <MapPin
                  size={24}
                  color="#94a3b8"
                  style={{ marginBottom: "8px" }}
                />
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  No saved addresses. Please add one to continue.
                </p>
              </div>
            ) : (
              savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "0.2s",
                    border:
                      selectedAddressId === addr.id
                        ? "2px solid var(--primary)"
                        : "1px solid var(--border)",
                    background:
                      selectedAddressId === addr.id ? "#f0fdfa" : "white",
                  }}
                >
                  <div
                    style={{
                      marginTop: "4px",
                      color:
                        selectedAddressId === addr.id
                          ? "var(--primary)"
                          : "#64748b",
                    }}
                  >
                    {getLabelIcon(addr.label)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <strong style={{ color: "var(--text-main)" }}>
                        {addr.label}
                      </strong>
                      {addr.is_default && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            background: "#e2e8f0",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontWeight: "bold",
                            color: "#475569",
                          }}
                        >
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        lineHeight: "1.4",
                      }}
                    >
                      {addr.full_address}
                    </p>

                    {/* Visual warning if an old address is missing GPS */}
                    {!(addr.lat || addr.latitude) && (
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "0.75rem",
                          color: "#ef4444",
                          fontWeight: "bold",
                        }}
                      >
                        ⚠️ Missing GPS Pin - Cannot use for checkout
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => deleteAddress(addr.id, e)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <h3
            style={{
              margin: "0 0 1.5rem 0",
              fontSize: "1.1rem",
              borderTop: "1px solid var(--border)",
              paddingTop: "1.5rem",
            }}
          >
            Payment Method
          </h3>
          <div style={{ display: "flex", gap: "12px", marginBottom: "2rem" }}>
            {[
              { id: "card", icon: <CreditCard size={18} />, label: "Card" },
              { id: "upi", icon: <Smartphone size={18} />, label: "UPI" },
              { id: "wallet", icon: <Wallet size={18} />, label: "Wallet" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border:
                    method === m.id
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                  background: method === m.id ? "#f0fdfa" : "white",
                  color:
                    method === m.id ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {method === "card" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label style={labelStyle}>Cardholder Name</label>
                <input type="text" placeholder="John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Card Number</label>
                <input
                  type="text"
                  placeholder="4111 2222 3333 4444"
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="text" placeholder="MM/YY" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CVV</label>
                  <input type="password" placeholder="•••" style={inputStyle} />
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "3rem 1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                textAlign: "center",
                border: "1px dashed #cbd5e1",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>
                {method === "upi"
                  ? "Scan QR Code on the next screen to pay via UPI."
                  : "Wallet selection will open in a secure window."}
              </span>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={paying || cart.length === 0 || !selectedAddressId}
            style={{
              width: "100%",
              marginTop: "2.5rem",
              padding: "16px",
              borderRadius: "var(--radius-btn)",
              border: "none",
              fontSize: "1.1rem",
              fontWeight: "700",
              cursor:
                cart.length === 0 || !selectedAddressId
                  ? "not-allowed"
                  : "pointer",
              transition: "0.2s",
              background:
                cart.length === 0 || !selectedAddressId
                  ? "#cbd5e1"
                  : "var(--primary)",
              color: "white",
              boxShadow:
                cart.length === 0 || !selectedAddressId
                  ? "none"
                  : "0 4px 6px -1px rgba(15, 118, 110, 0.2)",
            }}
          >
            {paying
              ? "Processing Transaction..."
              : `Pay ₹${total.toFixed(2)} Securely`}
          </button>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link
              to="/cart"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: "500",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={14} /> Back to Basket
            </Link>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            padding: "2rem",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1.5rem 0",
              fontSize: "1.1rem",
              color: "var(--text-main)",
              borderBottom: "1px solid #cbd5e1",
              paddingBottom: "12px",
            }}
          >
            Order Summary
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minHeight: "150px",
            }}
          >
            {cart.length > 0 ? (
              cart.map((it) => (
                <div
                  key={it.product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.95rem",
                    color: "var(--text-main)",
                  }}
                >
                  <span>
                    {it.product.name}{" "}
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      x{it.quantity}
                    </span>
                  </span>
                  <span style={{ fontWeight: "600" }}>
                    ₹
                    {(
                      Number(it.product.current_price) * (it.quantity || 1)
                    ).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                No items to display.
              </p>
            )}
          </div>
          <div
            style={{
              borderTop: "2px dashed #cbd5e1",
              paddingTop: "1.5rem",
              marginTop: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                marginBottom: "8px",
                fontSize: "0.9rem",
              }}
            >
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                marginBottom: "16px",
                fontSize: "0.9rem",
              }}
            >
              <span>Taxes & Fees</span>
              <span>₹0.00</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.3rem",
                fontWeight: "800",
                color: "var(--primary)",
              }}
            >
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
