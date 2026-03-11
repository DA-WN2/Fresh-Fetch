import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, ShieldCheck, LogOut } from "lucide-react";

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // Ensure you have an endpoint that returns the user's details!
        const res = await axios.get(
          "http://127.0.0.1:8000/api/customer/profile/",
          {
            headers: { Authorization: `Token ${token}` },
          },
        );
        setProfileData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
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
      style={{ maxWidth: "600px", margin: "4rem auto", padding: "0 1.5rem" }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
          overflow: "hidden",
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
            {profileData?.username?.toUpperCase() ||
              localStorage.getItem("username")?.toUpperCase()}
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
              display: "flex",
              flexDirection: "column",
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

          <button
            onClick={handleLogout}
            style={{
              marginTop: "2.5rem",
              width: "100%",
              padding: "12px",
              background: "#fee2e2",
              color: "#ef4444",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#fca5a5")}
            onMouseOut={(e) => (e.target.style.background = "#fee2e2")}
          >
            <LogOut size={18} /> Sign Out of Fresh-Fetch
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
