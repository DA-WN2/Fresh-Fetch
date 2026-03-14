import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  LogOut,
  MapPin,
  Home,
  Briefcase,
  Map,
  Trash2,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import "../styles/Marketplace.css";

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- NOTIFICATION STATE ---
  const [notification, setNotification] = useState({ text: "", type: "" });

  // --- ADD ADDRESS MODAL STATE ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    label: "Home",
    full_address: "",
    latitude: null,
    longitude: null,
    is_default: false,
  });

  const username = localStorage.getItem("username") || "Customer";

  const showNotification = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: "" }), 3500);
  };

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchAllData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // Fetch Profile & Addresses simultaneously
        const [profileRes, addressRes] = await Promise.all([
          axios
            .get("http://127.0.0.1:8000/api/customer/profile/", {
              headers: { Authorization: `Token ${token}` },
            })
            .catch(() => ({ data: null })), // Fallback if endpoint doesn't exist yet

          axios
            .get("http://127.0.0.1:8000/api/customer/addresses/", {
              headers: { Authorization: `Token ${token}` },
            })
            .catch(() => ({ data: [] })),
        ]);

        setProfileData(profileRes.data);
        setSavedAddresses(addressRes.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load profile data", err);
        setLoading(false);
      }
    };

    fetchAllData();
  }, [navigate]);

  // --- CAPTURE GPS FOR NEW ADDRESS ---
  const captureGPSForNewAddress = () => {
    if (!navigator.geolocation) {
      showNotification(
        "Geolocation is not supported by your browser.",
        "error",
      );
      return;
    }

    showNotification("Fetching exact GPS...", "success");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewAddressForm({
          ...newAddressForm,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        showNotification("Exact GPS coordinates pinned! ✓", "success");
      },
      (error) => {
        showNotification(
          "Please allow location access to pin address.",
          "error",
        );
      },
    );
  };

  // --- SAVE NEW ADDRESS ---
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!newAddressForm.latitude || !newAddressForm.longitude) {
      showNotification("Please tap 'Pin Exact GPS' before saving!", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/customer/addresses/",
        newAddressForm,
        { headers: { Authorization: `Token ${token}` } },
      );
      showNotification("Address saved successfully!", "success");
      setShowAddModal(false);
      setNewAddressForm({
        label: "Home",
        full_address: "",
        latitude: null,
        longitude: null,
        is_default: false,
      });

      // Refresh addresses
      const res = await axios.get(
        "http://127.0.0.1:8000/api/customer/addresses/",
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      setSavedAddresses(res.data);
    } catch (err) {
      showNotification("Failed to save address.", "error");
    }
  };

  // --- DELETE ADDRESS ---
  const deleteAddress = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/customer/addresses/${id}/`,
        {
          headers: { Authorization: `Token ${token}` },
        },
      );
      showNotification("Address deleted.", "success");

      // Refresh addresses
      setSavedAddresses(savedAddresses.filter((a) => a.id !== id));
    } catch (err) {
      showNotification("Failed to delete address.", "error");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getLabelIcon = (label) => {
    if (label.toLowerCase() === "home") return <Home size={20} />;
    if (label.toLowerCase() === "work") return <Briefcase size={20} />;
    return <Map size={20} />;
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

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          color: "var(--primary)",
          fontWeight: "bold",
        }}
      >
        Loading Profile...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "4rem auto",
        padding: "0 1.5rem",
        position: "relative",
      }}
    >
      {/* --- NOTIFICATION BANNER --- */}
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

      {/* --- ADD ADDRESS MODAL --- */}
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
                  Location Pin (Required for Delivery)
                </label>
                <button
                  type="button"
                  onClick={captureGPSForNewAddress}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: newAddressForm.latitude ? "#d1fae5" : "white",
                    border: newAddressForm.latitude
                      ? "1px solid #10b981"
                      : "1px solid var(--primary)",
                    color: newAddressForm.latitude
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
                  {newAddressForm.latitude
                    ? "Exact GPS Pinned ✓"
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

      {/* ========================================================================= */}
      {/* PROFILE DETAILS CARD */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        {/* Profile Header Banner */}
        <div
          style={{
            background: "var(--primary)",
            height: "100px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "-40px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "80px",
              height: "80px",
              backgroundColor: "white",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <User size={40} color="var(--primary)" />
          </div>
        </div>

        {/* Profile Info */}
        <div style={{ padding: "3rem 2rem 2rem 2rem", textAlign: "center" }}>
          <h2
            style={{
              margin: "1rem 0 0 0",
              color: "var(--text-main)",
              fontSize: "1.5rem",
            }}
          >
            {profileData?.username?.toUpperCase() || username.toUpperCase()}
          </h2>
          <p
            style={{
              margin: "4px 0 2rem 0",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}
          >
            Fresh-Fetch Member
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              textAlign: "left",
            }}
          >
            {/* Email Field */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <Mail size={18} color="#64748b" />
              </div>
              <div>
                <p
                  style={{
                    margin: "0",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                  }}
                >
                  Email Address
                </p>
                <p
                  style={{
                    margin: "0",
                    color: "var(--text-main)",
                    fontWeight: "500",
                  }}
                >
                  {profileData?.email || "No email on file"}
                </p>
              </div>
            </div>

            {/* Phone Number Field */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <Phone size={18} color="var(--primary)" />
              </div>
              <div>
                <p
                  style={{
                    margin: "0",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                  }}
                >
                  Contact Number
                </p>
                <p
                  style={{
                    margin: "0",
                    color: "var(--text-main)",
                    fontWeight: "500",
                  }}
                >
                  {profileData?.phone_number || "No number provided"}
                </p>
              </div>
            </div>

            {/* Account Role Field */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <ShieldCheck size={18} color="#10b981" />
              </div>
              <div>
                <p
                  style={{
                    margin: "0",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                  }}
                >
                  Account Type
                </p>
                <p
                  style={{
                    margin: "0",
                    color: "var(--text-main)",
                    fontWeight: "500",
                    textTransform: "capitalize",
                  }}
                >
                  {profileData?.role || localStorage.getItem("role")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SAVED ADDRESSES SECTION */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
          padding: "2rem",
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
          <h3
            style={{
              margin: 0,
              fontSize: "1.3rem",
              color: "var(--text-main)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <MapPin color="var(--primary)" /> Saved Addresses
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: "#f0fdfa",
              color: "var(--primary)",
              border: "1px solid #ccfbf1",
              padding: "8px 16px",
              borderRadius: "20px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "0.2s",
            }}
          >
            <Plus size={16} /> Add New
          </button>
        </div>

        {savedAddresses.length === 0 ? (
          <div
            style={{
              background: "var(--card-bg)",
              padding: "3rem",
              borderRadius: "12px",
              border: "1px dashed var(--border)",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <MapPin
              size={48}
              color="#cbd5e1"
              style={{ marginBottom: "1rem" }}
            />
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-main)" }}>
              No Addresses Saved
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              Add a delivery address to checkout faster.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {savedAddresses.map((addr) => (
              <div
                key={addr.id}
                style={{
                  background: "#f8fafc",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--primary)",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                    }}
                  >
                    {getLabelIcon(addr.label)} {addr.label}
                  </div>
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <p
                  style={{
                    margin: "0 0 1rem 0",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                    minHeight: "40px",
                  }}
                >
                  {addr.full_address}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "white",
                    border: "1px solid #cbd5e1",
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  <MapPin size={12} color="#10b981" />
                  GPS: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button
          onClick={handleLogout}
          style={{
            padding: "12px 24px",
            background: "white",
            color: "#ef4444",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#fee2e2")}
          onMouseOut={(e) => (e.target.style.background = "white")}
        >
          <LogOut size={18} /> Sign Out of Fresh-Fetch
        </button>
      </div>
    </div>
  );
};

export default Profile;
